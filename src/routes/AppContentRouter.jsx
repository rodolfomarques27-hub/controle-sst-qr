import React, { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, ShieldAlert } from "lucide-react";
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


function AcessoModuloSistemaBloqueado({ tela, bloqueio, permissao, erro }) {
    const resumo = obterResumoPermissaoSistema(permissao);
    const modulo = bloqueio?.modulo || obterModuloPermissaoSistemaPorTela(tela) || "módulo não mapeado";

    return (
        <Card className="border border-red-100 bg-red-50/80 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-red-100 p-3 text-red-700">
                        <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-red-600">Acesso bloqueado</p>
                        <h2 className="text-xl font-black text-slate-900">Sem permissão para acessar esta área</h2>
                        <p className="max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
                            {erro || bloqueio?.mensagem || "Seu perfil atual não possui permissão para visualizar este módulo."}
                        </p>
                        <div className="grid gap-2 text-xs font-bold text-slate-600 md:grid-cols-3">
                            <span className="rounded-2xl bg-white px-3 py-2 ring-1 ring-red-100">Tela: {tela || "não informada"}</span>
                            <span className="rounded-2xl bg-white px-3 py-2 ring-1 ring-red-100">Módulo: {modulo}</span>
                            <span className="rounded-2xl bg-white px-3 py-2 ring-1 ring-red-100">Perfil: {resumo.perfil}</span>
                        </div>
                    </div>
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-xs font-bold text-red-700 ring-1 ring-red-100">
                    Solicite liberação ao administrador do sistema.
                </div>
            </div>
        </Card>
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
