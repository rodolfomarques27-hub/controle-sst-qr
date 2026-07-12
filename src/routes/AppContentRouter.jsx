import React, { useEffect, useMemo, useRef, useState } from "react";
import { KeyRound, LayoutGrid, Lock, LockKeyhole, Send, UserRound } from "lucide-react";
import { Card, PasswordInput } from "../components/commonComponents";
import { CarregandoTela } from "../components/CarregandoTela";
import { LIMITE_STORAGE_MB } from "../constants/sistemaConstants";
import { supabase } from "../lib/supabaseClient";
import {
    carregarPermissaoSistemaAtualService,
    normalizarPermissaoSistema,
    registrarSolicitacaoAcessoSistemaService,
    obterBloqueioVisualTelaSistema,
    obterModuloPermissaoSistemaPorTela,
    obterResumoPermissaoSistema,
    usuarioPodeAcessarTelaSistema,
} from "../services/usuariosPermissoesSistemaService";

const ConsultaQR = React.lazy(() => import("../components/qr/ConsultaQR").then((modulo) => ({ default: modulo.ConsultaQR })));
const Requisitos = React.lazy(() => import("../components/Requisitos").then((modulo) => ({ default: modulo.Requisitos })));
const Aniversariantes = React.lazy(() => import("../components/aniversariantes/AniversariantesPage").then((modulo) => ({ default: modulo.Aniversariantes })));
const Dashboard = React.lazy(() => import("../components/dashboard/Dashboard").then((modulo) => ({ default: modulo.Dashboard })));
const Empresas = React.lazy(() => import("../components/empresas/EmpresasPage").then((modulo) => ({ default: modulo.Empresas })));
const Colaboradores = React.lazy(() => import("../components/colaboradores/ColaboradoresPage").then((modulo) => ({ default: modulo.Colaboradores })));
const Treinamentos = React.lazy(() => import("../components/treinamentos/TreinamentosPage").then((modulo) => ({ default: modulo.Treinamentos })));
const DdsPage = React.lazy(() => import("../components/dds/DdsPage").then((modulo) => ({ default: modulo.DdsPage })));
const RelatorioAuditoria = React.lazy(() => import("../components/auditoria/RelatorioAuditoria").then((modulo) => ({ default: modulo.RelatorioAuditoria })));
const DashboardAuditoriaCampo = React.lazy(() => import("../components/auditoria/DashboardAuditoriaCampo").then((modulo) => ({ default: modulo.DashboardAuditoriaCampo })));
const NovaAuditoriaCampoDireta = React.lazy(() => import("../components/auditoria/NovaAuditoriaCampoDireta").then((modulo) => ({ default: modulo.NovaAuditoriaCampoDireta })));
const ConfiguracoesSistema = React.lazy(() => import("../components/configuracoes/ConfiguracoesSistema").then((modulo) => ({ default: modulo.ConfiguracoesSistema })));
const ConfiguracoesBloqueio = React.lazy(() => import("../components/configuracoes/ConfiguracoesBloqueio").then((modulo) => ({ default: modulo.ConfiguracoesBloqueio })));
const EmergenciaQrPinCard = React.lazy(() => import("../components/configuracoes/EmergenciaQrPinCard").then((modulo) => ({ default: modulo.EmergenciaQrPinCard })));
const AcessosAppPage = React.lazy(() => import("../components/acessos/AcessosAppPage").then((modulo) => ({ default: modulo.AcessosAppPage })));


function precarregarModuloTelaSistema(tela = "") {
    switch (tela) {
        case "dashboard":
            return import("../components/dashboard/Dashboard");
        case "auditoriaCampo":
            return import("../components/auditoria/DashboardAuditoriaCampo");
        case "novaAuditoriaCampo":
            return import("../components/auditoria/NovaAuditoriaCampoDireta");
        case "empresas":
            return import("../components/empresas/EmpresasPage");
        case "colaboradores":
            return import("../components/colaboradores/ColaboradoresPage");
        case "aniversariantes":
            return import("../components/aniversariantes/AniversariantesPage");
        case "treinamentos":
            return import("../components/treinamentos/TreinamentosPage");
        case "dds":
            return import("../components/dds/DdsPage");
        case "qr":
            return import("../components/qr/ConsultaQR");
        case "auditoria":
            return import("../components/auditoria/RelatorioAuditoria");
        case "acessosApp":
            return import("../components/acessos/AcessosAppPage");
        case "configuracoes":
            return Promise.all([
                import("../components/configuracoes/ConfiguracoesSistema"),
                import("../components/configuracoes/ConfiguracoesBloqueio"),
            ]);
        case "roteiro":
            return import("../components/Requisitos");
        default:
            return Promise.resolve();
    }
}

const ORDEM_REDIRECIONAMENTO_TELAS_PERMITIDAS = [
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

function obterPrimeiraTelaPermitidaParaUsuario(permissao = null) {
    return ORDEM_REDIRECIONAMENTO_TELAS_PERMITIDAS.find((telaCandidata) =>
        usuarioPodeAcessarTelaSistema(permissao, telaCandidata)
    ) || "";
}

const ROTULOS_TELAS_ACESSO_BLOQUEADO = Object.freeze({
    dashboard: "Dashboard SST",
    novaAuditoriaCampo: "Nova Auditoria",
    auditoriaCampo: "Dashboard Auditoria",
    empresas: "Empresas",
    colaboradores: "Colaboradores",
    aniversariantes: "Aniversariantes",
    treinamentos: "Treinamentos",
    dds: "DDS",
    qr: "QR Code",
    auditoria: "Auditoria do Sistema",
    acessosApp: "Acessos do App",
    configuracoes: "Configurações",
    roteiro: "Manuais",
});

const ROTULOS_MODULOS_ACESSO_BLOQUEADO = Object.freeze({
    dashboard_sst: "Dashboard SST",
    empresas: "Empresas",
    colaboradores: "Colaboradores",
    treinamentos: "Treinamentos",
    dds: "DDS",
    qr_code: "QR Code",
    dashboard_auditoria: "Auditoria",
    nova_auditoria: "Nova Auditoria",
    auditoria_sistema: "Auditoria do Sistema",
    acessos_app: "Acessos do App",
    configuracoes: "Configurações",
    storage: "Storage",
    relatorios: "Relatórios",
});

const ROTULOS_PERFIS_ACESSO_BLOQUEADO = Object.freeze({
    administrador: "Administrador",
    tecnico_sst: "Técnico SST",
    auditor: "Auditor",
    gestor: "Gestor",
    consulta: "Consulta",
    bloqueado: "Bloqueado",
    "Sem permissão cadastrada": "Usuário sem perfil liberado",
});


function formatarRotuloAcessoBloqueado(valor, mapa, fallback = "Não informado") {
    const texto = String(valor || "").trim();

    if (!texto) return fallback;
    if (mapa[texto]) return mapa[texto];

    return texto
        .replace(/_/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\b\w/g, (letra) => letra.toUpperCase());
}

function AcessoModuloSistemaBloqueado({ tela, bloqueio, permissao, erro, usuario }) {
    const moduloExibicao = formatarRotuloAcessoBloqueado(
        bloqueio?.modulo || obterModuloPermissaoSistemaPorTela(tela),
        ROTULOS_MODULOS_ACESSO_BLOQUEADO,
        "Módulo não informado"
    );
    const resumo = obterResumoPermissaoSistema(permissao);
    const telaExibicao = formatarRotuloAcessoBloqueado(tela, ROTULOS_TELAS_ACESSO_BLOQUEADO, "Tela não informada");
    const perfilExibicao = formatarRotuloAcessoBloqueado(resumo.perfil, ROTULOS_PERFIS_ACESSO_BLOQUEADO, "Usuário sem perfil liberado");
    const mensagemPrincipal = erro || "Sem permissão para acessar esta área do sistema.";
    const emailUsuario = usuario?.email || permissao?.email || "Não informado";
    const nomeUsuario = usuario?.nome || permissao?.nome || (emailUsuario.includes("@") ? emailUsuario.split("@")[0] : "Não informado");
    const [enviandoSolicitacaoAcesso, setEnviandoSolicitacaoAcesso] = useState(false);
    const [mensagemSolicitacaoAcesso, setMensagemSolicitacaoAcesso] = useState("");
    const [erroSolicitacaoAcesso, setErroSolicitacaoAcesso] = useState("");

    async function handleSolicitarAcesso() {
        if (enviandoSolicitacaoAcesso) return;

        setEnviandoSolicitacaoAcesso(true);
        setMensagemSolicitacaoAcesso("");
        setErroSolicitacaoAcesso("");

        try {
            const solicitacaoSalva = await registrarSolicitacaoAcessoSistemaService({
                supabase,
                solicitacao: {
                    nome: nomeUsuario,
                    email: emailUsuario,
                    areaSolicitada: telaExibicao,
                    tela,
                    perfilAtual: perfilExibicao,
                    observacao: `Solicitação criada pela tela de acesso restrito. Módulo técnico: ${bloqueio?.modulo || obterModuloPermissaoSistemaPorTela(tela) || "não informado"}.`,
                },
            });

            const protocolo = solicitacaoSalva?.id ? ` Protocolo: ${solicitacaoSalva.id}.` : "";
            setMensagemSolicitacaoAcesso(`Solicitação registrada no sistema.${protocolo}`);
        } catch (erroSolicitacao) {
            setErroSolicitacaoAcesso(erroSolicitacao?.message || "Não foi possível registrar a solicitação de acesso.");
        } finally {
            setEnviandoSolicitacaoAcesso(false);
        }
    }

    return (
                <div className="flex min-h-[58vh] items-center justify-center px-4 py-10" data-modulo-acesso={moduloExibicao}>
            <Card className="w-full max-w-5xl overflow-hidden border border-slate-200 bg-white p-0 shadow-[0_18px_55px_rgba(15,23,42,0.10)]">
                <div className="grid min-h-[390px] md:grid-cols-[0.42fr_0.58fr]">
                    <aside className="relative flex flex-col items-center justify-center overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 px-8 py-10 text-center md:border-b-0 md:border-r">
                        <div className="relative mb-8 flex h-36 w-36 items-center justify-center rounded-[2.5rem] bg-white/70 shadow-inner ring-1 ring-slate-200">
                            <div className="absolute inset-3 rounded-[2rem] bg-gradient-to-br from-slate-100 to-white" />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white shadow-sm ring-1 ring-slate-100">
                                <LockKeyhole className="h-12 w-12 text-slate-500" strokeWidth={1.8} />
                            </div>
                            <div className="absolute -right-3 bottom-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-md ring-1 ring-orange-100">
                                <LockKeyhole className="h-6 w-6" />
                            </div>
                        </div>

                        <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">Permissão necessária</p>
                        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Acesso restrito</h2>
                        <div className="mt-4 h-1 w-14 rounded-full bg-orange-600" />
                        <p className="mt-6 max-w-[240px] text-sm font-semibold leading-7 text-slate-500">
                            Você não tem permissão para visualizar este conteúdo.
                        </p>
                    </aside>

                    <section className="flex flex-col justify-center px-6 py-8 sm:px-8 md:px-12">
                        <div className="max-w-2xl">
                            <h3 className="max-w-xl text-justify text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
                                Seu usuário ainda não possui permissão para acessar este conteúdo.
                            </h3>
                            <p className="mt-4 text-sm font-semibold leading-7 text-slate-500">
                                {mensagemPrincipal}
                            </p>

                            <div className="mt-7 rounded-3xl border border-slate-200 bg-slate-50/80 px-5 py-4 shadow-inner shadow-slate-100/60">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                                        <LayoutGrid className="h-5 w-5" strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-500">Área:</p>
                                        <p className="mt-1 text-base font-black text-slate-950">{telaExibicao}</p>
                                    </div>
                                </div>

                                <div className="my-4 h-px bg-slate-200" />

                                <div className="flex items-center gap-4">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200">
                                        <UserRound className="h-5 w-5" strokeWidth={2.2} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-500">Perfil atual:</p>
                                        <p className="mt-1 text-base font-black text-slate-950">{perfilExibicao}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleSolicitarAcesso}
                                    disabled={enviandoSolicitacaoAcesso}
                                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-8 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Send className="h-4 w-4" />
                                    {enviandoSolicitacaoAcesso ? "Enviando solicitação..." : "Solicitar acesso"}
                                </button>
                                {mensagemSolicitacaoAcesso ? (
                                    <p className="max-w-md rounded-2xl bg-emerald-50 px-4 py-3 text-center text-xs font-bold leading-5 text-emerald-700 ring-1 ring-emerald-100">
                                        {mensagemSolicitacaoAcesso}
                                    </p>
                                ) : null}
                                {erroSolicitacaoAcesso ? (
                                    <p className="max-w-md rounded-2xl bg-red-50 px-4 py-3 text-center text-xs font-bold leading-5 text-red-700 ring-1 ring-red-100">
                                        {erroSolicitacaoAcesso}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </section>
                </div>
            </Card>
        </div>
    );
}


function TrocaSenhaTemporariaObrigatoria({ usuario, permissao, onSenhaAtualizada }) {
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmarSenha, setConfirmarSenha] = useState("");
    const [salvando, setSalvando] = useState(false);
    const [erro, setErro] = useState("");
    const [mensagem, setMensagem] = useState("");

    async function handleSalvarSenhaTemporaria() {
        setErro("");
        setMensagem("");

        if (!novaSenha || !confirmarSenha) {
            setErro("Informe e confirme a nova senha.");
            return;
        }

        if (novaSenha.length < 6) {
            setErro("A nova senha deve ter pelo menos 6 caracteres.");
            return;
        }

        if (novaSenha !== confirmarSenha) {
            setErro("A confirmação da senha não confere.");
            return;
        }

        try {
            setSalvando(true);

            const { error: senhaError } = await supabase.auth.updateUser({
                password: novaSenha,
            });

            if (senhaError) {
                throw new Error(senhaError.message || "Não foi possível atualizar a senha no Supabase Auth.");
            }

            const { data, error: rpcError } = await supabase.rpc("finalizar_troca_senha_temporaria_sistema");

            if (rpcError) {
                throw new Error(rpcError.message || "Senha alterada, mas não foi possível finalizar a pendência no sistema.");
            }

            const permissaoAtualizada = Array.isArray(data) ? data[0] : data;
            setMensagem("Senha atualizada com sucesso. Seu acesso foi liberado.");
            setNovaSenha("");
            setConfirmarSenha("");
            onSenhaAtualizada?.(permissaoAtualizada || { ...permissao, precisa_trocar_senha: false });
        } catch (error) {
            setErro(error?.message || "Não foi possível alterar a senha temporária.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <div className="flex min-h-[58vh] items-center justify-center px-4 py-10">
            <Card className="w-full max-w-4xl overflow-hidden border border-slate-200 bg-white p-0 shadow-[0_18px_55px_rgba(15,23,42,0.10)]">
                <div className="grid min-h-[390px] md:grid-cols-[0.42fr_0.58fr]">
                    <aside className="relative flex flex-col items-center justify-center overflow-hidden border-b border-slate-200 bg-gradient-to-br from-orange-50 via-white to-slate-50 px-8 py-10 text-center md:border-b-0 md:border-r">
                        <div className="relative mb-8 flex h-36 w-36 items-center justify-center rounded-[2.5rem] bg-white/70 shadow-inner ring-1 ring-orange-100">
                            <div className="absolute inset-3 rounded-[2rem] bg-gradient-to-br from-orange-50 to-white" />
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white shadow-sm ring-1 ring-orange-100">
                                <KeyRound className="h-12 w-12 text-orange-600" strokeWidth={1.8} />
                            </div>
                        </div>

                        <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-700">Primeiro acesso</p>
                        <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Troque sua senha</h2>
                        <div className="mt-4 h-1 w-14 rounded-full bg-orange-600" />
                        <p className="mt-6 max-w-[260px] text-sm font-semibold leading-7 text-slate-500">
                            Seu login foi criado com senha temporária. Altere a senha para continuar usando o sistema.
                        </p>
                    </aside>

                    <section className="flex flex-col justify-center px-6 py-8 sm:px-8 md:px-12">
                        <div className="max-w-2xl">
                            <h3 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
                                Atualização obrigatória de senha
                            </h3>
                            <p className="mt-4 text-sm font-semibold leading-7 text-slate-500">
                                Usuário: <span className="text-slate-800">{permissao?.email || usuario?.email || "não informado"}</span>. A nova senha ficará salva somente no Supabase Auth.
                            </p>

                            <div className="mt-7 space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 shadow-inner shadow-slate-100/60">
                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Nova senha</label>
                                    <PasswordInput
                                        value={novaSenha}
                                        onChange={(event) => setNovaSenha(event.target.value)}
                                        placeholder="Digite a nova senha"
                                        autoComplete="new-password"
                                        inputClassName="focus:ring-2 focus:ring-orange-200"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">Confirmar nova senha</label>
                                    <PasswordInput
                                        value={confirmarSenha}
                                        onChange={(event) => setConfirmarSenha(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === "Enter") handleSalvarSenhaTemporaria();
                                        }}
                                        placeholder="Confirme a nova senha"
                                        autoComplete="new-password"
                                        inputClassName="focus:ring-2 focus:ring-orange-200"
                                    />
                                </div>

                                {erro ? (
                                    <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700 ring-1 ring-red-200">
                                        {erro}
                                    </div>
                                ) : null}
                                {mensagem ? (
                                    <div className="rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                                        {mensagem}
                                    </div>
                                ) : null}
                            </div>

                            <button
                                type="button"
                                onClick={handleSalvarSenhaTemporaria}
                                disabled={salvando}
                                className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-8 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <KeyRound className="h-4 w-4" />
                                {salvando ? "Salvando nova senha..." : "Salvar nova senha"}
                            </button>
                        </div>
                    </section>
                </div>
            </Card>
        </div>
    );
}

export function AppContentRouter({
    tela,
    colaboradores,
    empresasBanco,
    obrasEmpresasBanco = [],
    documentosEmpresas,
    auditoria,
    auditoriasCampo,
    emailsEnviados,
    usuario,
    colaboradorSelecionado,
    carregandoBanco,
    erroBanco,
    carregandoAuditoriasCampo,
    carregandoMaisAuditoriasCampo,
    erroAuditoriasCampo,
    existeMaisAuditoriasCampo,
    limitesCarregamentoSistema,
    podeAcessarAuditoria,
    carregandoAuditoria,
    carregandoMaisAuditoria,
    existeMaisAuditoria,
    configuracoesDesbloqueadas,
    senhaConfiguracoesSistema,
    origemSenhaConfiguracoesSistema,
    mensagemSenhaConfiguracoesSistema,
    atualizandoDashboardSst,
    senhaConfiguracoes,
    mostrarSenhaConfiguracoes,
    erroSenhaConfiguracoes,
    setSenhaConfiguracoes,
    setErroSenhaConfiguracoes,
    setMostrarSenhaConfiguracoes,
    onValidarSenhaConfiguracoes,
    onSelectColab,
    onRegistrarEmailEnviado,
    onAtualizarInformacoesDashboardSst,
    onAuditoriaSalva,
    onAuditoriaAtualizada,
    onRecarregarAuditoriasCampo,
    onCarregarMaisAuditoriasCampo,
    onAtualizarBanco,
    onAdicionarEmpresa,
    onAtualizarEmpresa,
    onExcluirEmpresa,
    onAdicionarDocumentoEmpresa,
    onExcluirDocumentoEmpresa,
    onVisualizarDocumentoEmpresa,
    onAdicionarColaborador,
    onAtualizarColaborador,
    onExcluirColaborador,
    onEnviarTreinamento,
    onSalvarCertificado,
    onVisualizarCertificado,
    onExcluirCertificado,
    onAtualizarDatasCertificado,
    onSincronizarStorage,
    onSelecionarColaboradorQr,
    onAtualizarAuditoria,
    onCarregarMaisAuditoria,
    onListarArquivosStorage,
    onExcluirArquivoStorage,
    onListarUsuariosAuditoria,
    onSalvarUsuarioAuditoria,
    onAlternarUsuarioAuditoria,
    onBloquearAuditoria,
    onBloquearConfiguracoes,
    onSalvarLimites,
    onSalvarSenhaConfiguracoes,
    onRegistrarAuditoria,
    permissaoSistemaUsuario = null,
    carregandoPermissaoSistemaUsuario = false,
    erroPermissaoSistemaUsuario = "",
    onPermissaoSistemaAtualizada,
    onRedirecionarTelaPermitida,
}) {
    const [permissaoSistemaTela, setPermissaoSistemaTela] = useState(() => normalizarPermissaoSistema(permissaoSistemaUsuario || null));
    const [carregandoPermissaoSistemaTela, setCarregandoPermissaoSistemaTela] = useState(() => Boolean(carregandoPermissaoSistemaUsuario || (usuario?.email && !permissaoSistemaUsuario)));
    const [erroPermissaoSistemaTela, setErroPermissaoSistemaTela] = useState(() => erroPermissaoSistemaUsuario || "");
    const [telaComModuloPronto, setTelaComModuloPronto] = useState("");
    const ultimoRedirecionamentoAutomaticoRef = useRef("");

    useEffect(() => {
        let componenteAtivo = true;

        async function carregarPermissaoTela() {
            if (!usuario?.email) {
                setPermissaoSistemaTela(null);
                setErroPermissaoSistemaTela("");
                setCarregandoPermissaoSistemaTela(false);
                return;
            }

            try {
                if (carregandoPermissaoSistemaUsuario) {
                    setCarregandoPermissaoSistemaTela(true);
                    setErroPermissaoSistemaTela("");
                    return;
                }

                if (erroPermissaoSistemaUsuario) {
                    setPermissaoSistemaTela(null);
                    setErroPermissaoSistemaTela(erroPermissaoSistemaUsuario);
                    setCarregandoPermissaoSistemaTela(false);
                    return;
                }

                if (permissaoSistemaUsuario) {
                    const permissaoInicial = normalizarPermissaoSistema(permissaoSistemaUsuario);
                    setPermissaoSistemaTela(permissaoInicial);
                    setErroPermissaoSistemaTela("");
                    setCarregandoPermissaoSistemaTela(false);
                    return;
                }

                setCarregandoPermissaoSistemaTela(true);
                setErroPermissaoSistemaTela("");

                let permissao = null;

                // Primeiro registra/vincula o login atual. Esta RPC também retorna os campos de primeiro acesso,
                // incluindo precisa_trocar_senha, quando o SQL do Roteiro 14 já foi aplicado no Supabase.
                try {
                    const { data: permissaoRegistrada, error: registrarLoginError } = await supabase.rpc("registrar_login_usuario_sistema");

                    if (!registrarLoginError) {
                        const registro = Array.isArray(permissaoRegistrada) ? permissaoRegistrada[0] : permissaoRegistrada;
                        permissao = normalizarPermissaoSistema(registro || null);
                    }
                } catch {
                    // Mantém fallback abaixo para ambientes que ainda não receberam a RPC nova.
                }

                if (!permissao) {
                    permissao = await carregarPermissaoSistemaAtualService({ supabase });
                }

                if (componenteAtivo) {
                    setPermissaoSistemaTela(permissao);
                    onPermissaoSistemaAtualizada?.(permissao);
                }
            } catch (error) {
                if (componenteAtivo) {
                    setPermissaoSistemaTela(null);
                    setErroPermissaoSistemaTela(error?.message || "Não foi possível validar a permissão do usuário.");
                }
            } finally {
                if (componenteAtivo) {
                    setCarregandoPermissaoSistemaTela(false);
                }
            }
        }

        carregarPermissaoTela();

        return () => {
            componenteAtivo = false;
        };
    }, [
        carregandoPermissaoSistemaUsuario,
        erroPermissaoSistemaUsuario,
        onPermissaoSistemaAtualizada,
        permissaoSistemaUsuario,
        usuario?.email,
    ]);

    const bloqueioTelaSistema = useMemo(
        () => obterBloqueioVisualTelaSistema(permissaoSistemaTela, tela),
        [permissaoSistemaTela, tela]
    );

    const telaControladaPorPermissao = Boolean(obterModuloPermissaoSistemaPorTela(tela));
    const permissaoProntaParaDecisao = !carregandoPermissaoSistemaTela && Boolean(permissaoSistemaTela) && !erroPermissaoSistemaTela;
    const trocaSenhaTemporariaObrigatoria = permissaoProntaParaDecisao && permissaoSistemaTela?.precisa_trocar_senha === true;
    const telaBloqueadaPorPermissao = telaControladaPorPermissao
        && !carregandoPermissaoSistemaTela
        && (Boolean(erroPermissaoSistemaTela) || bloqueioTelaSistema.bloqueado);

    const primeiraTelaPermitidaSistema = useMemo(() => {
        if (!permissaoProntaParaDecisao || trocaSenhaTemporariaObrigatoria) return "";
        return obterPrimeiraTelaPermitidaParaUsuario(permissaoSistemaTela);
    }, [permissaoProntaParaDecisao, permissaoSistemaTela, trocaSenhaTemporariaObrigatoria]);

    const deveRedirecionarParaTelaPermitida = Boolean(
        onRedirecionarTelaPermitida
        && telaControladaPorPermissao
        && telaBloqueadaPorPermissao
        && primeiraTelaPermitidaSistema
        && primeiraTelaPermitidaSistema !== tela
        && !trocaSenhaTemporariaObrigatoria
    );

    useEffect(() => {
        if (!usuario?.email) {
            return undefined;
        }

        if (trocaSenhaTemporariaObrigatoria) {
            return undefined;
        }

        if (erroPermissaoSistemaTela) {
            return undefined;
        }

        if (!permissaoProntaParaDecisao) {
            return undefined;
        }

        const telaDestino = deveRedirecionarParaTelaPermitida ? primeiraTelaPermitidaSistema : tela;

        if (!telaDestino) {
            return undefined;
        }

        if (telaComModuloPronto === telaDestino) {
            if (deveRedirecionarParaTelaPermitida) {
                const chaveRedirecionamento = `${usuario?.email || "sem-usuario"}:${tela}:${telaDestino}`;
                if (ultimoRedirecionamentoAutomaticoRef.current !== chaveRedirecionamento) {
                    ultimoRedirecionamentoAutomaticoRef.current = chaveRedirecionamento;
                    onRedirecionarTelaPermitida?.(telaDestino);
                }
            }

            return undefined;
        }

        let ativo = true;

        Promise.resolve(precarregarModuloTelaSistema(telaDestino))
            .catch(() => {
                // Se o preload falhar, o React.lazy ainda tentará carregar o módulo na renderização.
            })
            .finally(() => {
                if (!ativo) return;

                setTelaComModuloPronto(telaDestino);

                if (deveRedirecionarParaTelaPermitida) {
                    const chaveRedirecionamento = `${usuario?.email || "sem-usuario"}:${tela}:${telaDestino}`;
                    if (ultimoRedirecionamentoAutomaticoRef.current !== chaveRedirecionamento) {
                        ultimoRedirecionamentoAutomaticoRef.current = chaveRedirecionamento;
                        onRedirecionarTelaPermitida?.(telaDestino);
                    }
                }
            });

        return () => {
            ativo = false;
        };
    }, [
        deveRedirecionarParaTelaPermitida,
        onRedirecionarTelaPermitida,
        erroPermissaoSistemaTela,
        permissaoProntaParaDecisao,
        primeiraTelaPermitidaSistema,
        tela,
        telaComModuloPronto,
        trocaSenhaTemporariaObrigatoria,
        usuario?.email,
    ]);

    const aguardandoTelaPermitida = Boolean(
        telaControladaPorPermissao
        && !trocaSenhaTemporariaObrigatoria
        && !erroPermissaoSistemaTela
        && (
            carregandoPermissaoSistemaTela
            || !permissaoProntaParaDecisao
            || deveRedirecionarParaTelaPermitida
            || telaComModuloPronto !== tela
        )
    );

    // Regra geral para todos os perfis: a tela só é montada depois que a permissão,
    // o redirecionamento automático e o preload do módulo final terminam. Assim a
    // atualização não mostra conteúdo parcial, loading duplicado ou flash de bloqueio.
    if (aguardandoTelaPermitida) {
        return (
            <CarregandoTela
                mensagem="Carregando módulo..."
                subtitulo="Validando o acesso e preparando a área selecionada."
            />
        );
    }

    if (trocaSenhaTemporariaObrigatoria) {
        return (
            <TrocaSenhaTemporariaObrigatoria
                usuario={usuario}
                permissao={permissaoSistemaTela}
                onSenhaAtualizada={(permissaoAtualizada) => {
                    setPermissaoSistemaTela(permissaoAtualizada);
                    onPermissaoSistemaAtualizada?.(permissaoAtualizada);
                }}
            />
        );
    }

    if (telaBloqueadaPorPermissao) {
        return (
            <AcessoModuloSistemaBloqueado
                tela={tela}
                bloqueio={bloqueioTelaSistema}
                permissao={permissaoSistemaTela}
                erro={erroPermissaoSistemaTela}
                usuario={usuario}
            />
        );
    }

    return (
        <React.Suspense
            fallback={(
                <CarregandoTela
                    mensagem="Carregando módulo..."
                    subtitulo="Preparando a área selecionada."
                />
            )}
        >
            {tela === "dashboard" && (
                <Dashboard
                            usuario={usuario}
                    colaboradores={colaboradores}
                    empresasBanco={empresasBanco}
                    documentosEmpresas={documentosEmpresas}
                    auditoria={auditoria}
                    auditoriasCampo={auditoriasCampo}
                    onSelectColab={onSelectColab}
                    onRegistrarEmailEnviado={onRegistrarEmailEnviado}
                    onAtualizarInformacoes={onAtualizarInformacoesDashboardSst}
                    atualizandoInformacoes={atualizandoDashboardSst}
                />
            )}

            {tela === "novaAuditoriaCampo" && (
                <NovaAuditoriaCampoDireta
                    usuario={usuario}
                    empresasBanco={empresasBanco}
                    onAuditoriaSalva={onAuditoriaSalva}
                />
            )}

            {tela === "auditoriaCampo" && (
                <DashboardAuditoriaCampo
                    auditoriasCampo={auditoriasCampo}
                    carregando={carregandoAuditoriasCampo}
                    erro={erroAuditoriasCampo}
                    onRecarregar={onRecarregarAuditoriasCampo}
                    onCarregarMaisAuditoriasCampo={onCarregarMaisAuditoriasCampo}
                    carregandoMaisAuditoriasCampo={carregandoMaisAuditoriasCampo}
                    existeMaisAuditoriasCampo={existeMaisAuditoriasCampo}
                    limiteQrcodesCampo={limitesCarregamentoSistema.qrcodesCampo}
                    onAuditoriaAtualizada={onAuditoriaAtualizada}
                />
            )}

            {tela === "empresas" && (
                <Empresas
                    empresasBanco={empresasBanco}
                    documentosEmpresas={documentosEmpresas}
                    colaboradores={colaboradores}
                    carregandoBanco={carregandoBanco}
                    erroBanco={erroBanco}
                    onAtualizarBanco={onAtualizarBanco}
                    onAdicionarEmpresa={onAdicionarEmpresa}
                    onAtualizarEmpresa={onAtualizarEmpresa}
                    onExcluirEmpresa={onExcluirEmpresa}
                    onAdicionarDocumentoEmpresa={onAdicionarDocumentoEmpresa}
                    onExcluirDocumentoEmpresa={onExcluirDocumentoEmpresa}
                    onVisualizarDocumentoEmpresa={onVisualizarDocumentoEmpresa}
                />
            )}

            {tela === "colaboradores" && (
                <Colaboradores
                    colaboradores={colaboradores}
                    empresasBanco={empresasBanco}
                    carregandoBanco={carregandoBanco}
                    erroBanco={erroBanco}
                    onAtualizarBanco={onAtualizarBanco}
                    onAdicionarColaborador={onAdicionarColaborador}
                    onAtualizarColaborador={onAtualizarColaborador}
                    onExcluirColaborador={onExcluirColaborador}
                    onSelectColab={onSelectColab}
                    onEnviarTreinamento={onEnviarTreinamento}
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
                    onSalvarCertificado={onSalvarCertificado}
                    onVisualizarCertificado={onVisualizarCertificado}
                    onExcluirCertificado={onExcluirCertificado}
                    onAtualizarDatasCertificado={onAtualizarDatasCertificado}
                    onSincronizarStorage={onSincronizarStorage}
                    onRegistrarEmailEnviado={onRegistrarEmailEnviado}
                />
            )}

            {tela === "dds" && (
                <DdsPage
                    supabase={supabase}
                    colaboradores={colaboradores}
                    empresasBanco={empresasBanco}
                    obrasEmpresasBanco={obrasEmpresasBanco}
                    usuario={usuario}
                />
            )}

            {tela === "qr" && (
                <ConsultaQR
                    colaborador={colaboradorSelecionado}
                    colaboradores={colaboradores}
                    onSelecionarColaborador={onSelecionarColaboradorQr}
                />
            )}

            {tela === "auditoria" && (
                <RelatorioAuditoria
                    auditoria={auditoria}
                    emailsEnviados={emailsEnviados}
                    carregando={carregandoAuditoria}
                    carregandoMaisAuditoria={carregandoMaisAuditoria}
                    existeMaisAuditoria={existeMaisAuditoria}
                    onAtualizar={onAtualizarAuditoria}
                    onCarregarMaisAuditoria={onCarregarMaisAuditoria}
                    onListarUsuariosAuditoria={onListarUsuariosAuditoria}
                    onSalvarUsuarioAuditoria={onSalvarUsuarioAuditoria}
                    onAlternarUsuarioAuditoria={onAlternarUsuarioAuditoria}
                    onBloquear={onBloquearAuditoria}
                    onRegistrarAuditoria={onRegistrarAuditoria}
                />
            )}

            {tela === "acessosApp" && (
                <AcessosAppPage
                    usuario={usuario}
                    empresasBanco={empresasBanco}
                />
            )}

            {tela === "configuracoes" && (
                configuracoesDesbloqueadas ? (
                    <div className="page-shell space-y-4">
                        <ConfiguracoesSistema
                            empresasBanco={empresasBanco}
                            acaoTopo={(
                                <button
                                    type="button"
                                    onClick={onBloquearConfiguracoes}
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
                            onSalvarLimites={onSalvarLimites}
                            onListarArquivosStorage={onListarArquivosStorage}
                            onExcluirArquivoStorage={onExcluirArquivoStorage}
                            onAtualizarAuditoria={onAtualizarAuditoria}
                            senhaConfiguracoesSistema={senhaConfiguracoesSistema}
                            origemSenhaConfiguracoesSistema={origemSenhaConfiguracoesSistema}
                            mensagemSenhaConfiguracoesSistema={mensagemSenhaConfiguracoesSistema}
                            onSalvarSenhaConfiguracoes={onSalvarSenhaConfiguracoes}
                            onRegistrarAuditoria={onRegistrarAuditoria}
                        />

                        <EmergenciaQrPinCard
                            empresasBanco={empresasBanco}
                        />

                    </div>
                ) : (
                    <ConfiguracoesBloqueio
                        senhaConfiguracoes={senhaConfiguracoes}
                        senhaConfiguracoesSistema={senhaConfiguracoesSistema}
                        mostrarSenhaConfiguracoes={mostrarSenhaConfiguracoes}
                        erroSenhaConfiguracoes={erroSenhaConfiguracoes}
                        onValidarSenha={onValidarSenhaConfiguracoes}
                        setSenhaConfiguracoes={setSenhaConfiguracoes}
                        setErroSenhaConfiguracoes={setErroSenhaConfiguracoes}
                        setMostrarSenhaConfiguracoes={setMostrarSenhaConfiguracoes}
                    />
                )
            )}

            {tela === "roteiro" && <Requisitos />}
        </React.Suspense>
    );
}
