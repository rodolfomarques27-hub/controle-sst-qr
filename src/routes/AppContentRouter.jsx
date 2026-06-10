import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Info, Lock, LockKeyhole, RefreshCw, Send, ShieldCheck } from "lucide-react";
import { Card } from "../components/commonComponents";
import { CarregandoTela } from "../components/CarregandoTela";
import { LIMITE_STORAGE_MB } from "../constants/sistemaConstants";
import { supabase } from "../lib/supabaseClient";
import {
    carregarPermissaoSistemaAtualService,
    obterBloqueioVisualTelaSistema,
    obterModuloPermissaoSistemaPorTela,
    obterResumoPermissaoSistema,
} from "../services/usuariosPermissoesSistemaService";

const ConsultaQR = React.lazy(() => import("../components/qr/ConsultaQR").then((modulo) => ({ default: modulo.ConsultaQR })));
const Requisitos = React.lazy(() => import("../components/Requisitos").then((modulo) => ({ default: modulo.Requisitos })));
const Aniversariantes = React.lazy(() => import("../components/aniversariantes/AniversariantesPage").then((modulo) => ({ default: modulo.Aniversariantes })));
const Dashboard = React.lazy(() => import("../components/dashboard/Dashboard").then((modulo) => ({ default: modulo.Dashboard })));
const Empresas = React.lazy(() => import("../components/empresas/EmpresasPage").then((modulo) => ({ default: modulo.Empresas })));
const Colaboradores = React.lazy(() => import("../components/colaboradores/ColaboradoresPage").then((modulo) => ({ default: modulo.Colaboradores })));
const Treinamentos = React.lazy(() => import("../components/treinamentos/TreinamentosPage").then((modulo) => ({ default: modulo.Treinamentos })));
const RelatorioAuditoria = React.lazy(() => import("../components/auditoria/RelatorioAuditoria").then((modulo) => ({ default: modulo.RelatorioAuditoria })));
const DashboardAuditoriaCampo = React.lazy(() => import("../components/auditoria/DashboardAuditoriaCampo").then((modulo) => ({ default: modulo.DashboardAuditoriaCampo })));
const NovaAuditoriaCampoDireta = React.lazy(() => import("../components/auditoria/NovaAuditoriaCampoDireta").then((modulo) => ({ default: modulo.NovaAuditoriaCampoDireta })));
const ConfiguracoesSistema = React.lazy(() => import("../components/configuracoes/ConfiguracoesSistema").then((modulo) => ({ default: modulo.ConfiguracoesSistema })));
const ConfiguracoesBloqueio = React.lazy(() => import("../components/configuracoes/ConfiguracoesBloqueio").then((modulo) => ({ default: modulo.ConfiguracoesBloqueio })));
const AuditoriaAcessoNegado = React.lazy(() => import("../components/auditoria/AuditoriaPermissao").then((modulo) => ({ default: modulo.AuditoriaAcessoNegado })));


const ROTULOS_TELAS_ACESSO_BLOQUEADO = Object.freeze({
    dashboard: "Dashboard SST",
    novaAuditoriaCampo: "Nova Auditoria",
    auditoriaCampo: "Dashboard Auditoria",
    empresas: "Empresas",
    colaboradores: "Colaboradores",
    aniversariantes: "Aniversariantes",
    treinamentos: "Treinamentos",
    qr: "QR Code",
    auditoria: "Auditoria do Sistema",
    configuracoes: "Configurações",
    roteiro: "Roteiro",
});

const ROTULOS_MODULOS_ACESSO_BLOQUEADO = Object.freeze({
    dashboard_sst: "Dashboard SST",
    empresas: "Empresas",
    colaboradores: "Colaboradores",
    treinamentos: "Treinamentos",
    qr_code: "QR Code",
    dashboard_auditoria: "Auditoria",
    nova_auditoria: "Nova Auditoria",
    auditoria_sistema: "Auditoria do Sistema",
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

function AcessoModuloSistemaBloqueado({ tela, bloqueio, permissao, erro }) {
    const resumo = obterResumoPermissaoSistema(permissao);
    const modulo = bloqueio?.modulo || obterModuloPermissaoSistemaPorTela(tela) || "módulo não mapeado";
    const telaExibicao = formatarRotuloAcessoBloqueado(tela, ROTULOS_TELAS_ACESSO_BLOQUEADO, "Tela não informada");
    const moduloExibicao = formatarRotuloAcessoBloqueado(modulo, ROTULOS_MODULOS_ACESSO_BLOQUEADO, "Módulo não mapeado");
    const perfilExibicao = formatarRotuloAcessoBloqueado(resumo.perfil, ROTULOS_PERFIS_ACESSO_BLOQUEADO, "Usuário sem perfil liberado");
    const mensagemPrincipal = erro || bloqueio?.mensagem || "Seu usuário ainda não possui permissão para acessar este conteúdo.";

    return (
        <div className="flex min-h-[58vh] items-center justify-center px-4 py-10">
            <Card className="w-full max-w-5xl overflow-hidden border border-slate-200 bg-white p-0 shadow-[0_18px_55px_rgba(15,23,42,0.10)]">
                <div className="grid min-h-[390px] md:grid-cols-[0.42fr_0.58fr]">
                    <aside className="relative flex flex-col items-center justify-center overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 px-8 py-10 text-center md:border-b-0 md:border-r">
                        <div className="pointer-events-none absolute left-10 top-16 grid grid-cols-3 gap-2 opacity-30">
                            {Array.from({ length: 9 }).map((_, indice) => (
                                <span key={indice} className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                            ))}
                        </div>
                        <span className="pointer-events-none absolute right-16 top-14 text-2xl font-black text-slate-300">×</span>
                        <span className="pointer-events-none absolute bottom-20 left-14 h-2 w-2 rounded-full bg-slate-300" />

                        <div className="relative mb-8 flex h-36 w-36 items-center justify-center rounded-[2.5rem] bg-white/70 shadow-inner ring-1 ring-slate-200">
                            <div className="absolute inset-3 rounded-[2rem] bg-gradient-to-br from-slate-100 to-white" />
                            <ShieldCheck className="relative h-24 w-24 text-slate-400 drop-shadow-sm" strokeWidth={1.35} />
                            <LockKeyhole className="absolute h-11 w-11 text-slate-500" strokeWidth={1.7} />
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
                            <h3 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
                                Seu usuário ainda não possui permissão para acessar este conteúdo.
                            </h3>
                            <p className="mt-4 text-sm font-semibold leading-7 text-slate-500">
                                {mensagemPrincipal}
                            </p>

                            <div className="mt-7 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 shadow-inner shadow-slate-100/60">
                                <div className="grid gap-5 md:grid-cols-3 md:divide-x md:divide-slate-200">
                                    <div className="md:pr-5">
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Tela</p>
                                        <p className="mt-2 text-sm font-black text-slate-950">{telaExibicao}</p>
                                    </div>
                                    <div className="md:px-5">
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Módulo</p>
                                        <p className="mt-2 text-sm font-black text-slate-950">{moduloExibicao}</p>
                                    </div>
                                    <div className="md:pl-5">
                                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Perfil</p>
                                        <p className="mt-2 text-sm font-black text-slate-950">{perfilExibicao}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 flex items-start gap-3 rounded-3xl bg-amber-50/70 px-5 py-4 text-sm font-semibold leading-6 text-slate-500 ring-1 ring-amber-100">
                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                                    <Info className="h-4 w-4" />
                                </div>
                                <p>
                                    Se necessário, peça ao administrador a liberação em Configurações &gt; Usuários e Permissões.
                                </p>
                            </div>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => window.alert("Solicite ao administrador a liberação em Configurações > Usuários e Permissões.")}
                                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
                                >
                                    <Send className="h-4 w-4" />
                                    Solicitar acesso
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Voltar
                                </button>
                            </div>
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
    verificandoAcessoAuditoria,
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
}) {
    const [permissaoSistemaTela, setPermissaoSistemaTela] = useState(null);
    const [carregandoPermissaoSistemaTela, setCarregandoPermissaoSistemaTela] = useState(() => Boolean(usuario?.email));
    const [erroPermissaoSistemaTela, setErroPermissaoSistemaTela] = useState("");

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
                setCarregandoPermissaoSistemaTela(true);
                setErroPermissaoSistemaTela("");
                const permissao = await carregarPermissaoSistemaAtualService({ supabase });

                if (componenteAtivo) {
                    setPermissaoSistemaTela(permissao);
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
    }, [usuario?.email]);

    const bloqueioTelaSistema = useMemo(
        () => obterBloqueioVisualTelaSistema(permissaoSistemaTela, tela),
        [permissaoSistemaTela, tela]
    );

    const telaControladaPorPermissao = Boolean(obterModuloPermissaoSistemaPorTela(tela));
    const telaBloqueadaPorPermissao = telaControladaPorPermissao
        && !carregandoPermissaoSistemaTela
        && (Boolean(erroPermissaoSistemaTela) || bloqueioTelaSistema.bloqueado);

    if (telaControladaPorPermissao && carregandoPermissaoSistemaTela) {
        return (
            <Card>
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verificando permissão de acesso ao módulo...
                </div>
            </Card>
        );
    }

    if (telaBloqueadaPorPermissao) {
        return (
            <AcessoModuloSistemaBloqueado
                tela={tela}
                bloqueio={bloqueioTelaSistema}
                permissao={permissaoSistemaTela}
                erro={erroPermissaoSistemaTela}
            />
        );
    }

    return (
        <React.Suspense fallback={<CarregandoTela mensagem="Carregando módulo..." subtitulo="Preparando as informações desta área do sistema." />}>
            {tela === "dashboard" && (
                <Dashboard
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

            {tela === "qr" && (
                <ConsultaQR
                    colaborador={colaboradorSelecionado}
                    colaboradores={colaboradores}
                    onSelecionarColaborador={onSelecionarColaboradorQr}
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
                        onAtualizar={onAtualizarAuditoria}
                        onCarregarMaisAuditoria={onCarregarMaisAuditoria}
                        onListarArquivosStorage={onListarArquivosStorage}
                        onExcluirArquivoStorage={onExcluirArquivoStorage}
                        onListarUsuariosAuditoria={onListarUsuariosAuditoria}
                        onSalvarUsuarioAuditoria={onSalvarUsuarioAuditoria}
                        onAlternarUsuarioAuditoria={onAlternarUsuarioAuditoria}
                        onBloquear={onBloquearAuditoria}
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
                            senhaConfiguracoesSistema={senhaConfiguracoesSistema}
                            origemSenhaConfiguracoesSistema={origemSenhaConfiguracoesSistema}
                            mensagemSenhaConfiguracoesSistema={mensagemSenhaConfiguracoesSistema}
                            onSalvarSenhaConfiguracoes={onSalvarSenhaConfiguracoes}
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
