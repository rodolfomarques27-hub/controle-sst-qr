import React, { useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, Lock, Mail, MessageCircle, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { FUNCAO_EMAIL_ALERTA_TST, statusDesvioAuditoriaCampo } from "../../constants/sstConstants";
import { FotoAuditoriaPreview } from "../commonComponents";
import { PreviaNotificacaoAuditoriaCampo } from "./PreviaNotificacaoAuditoriaCampo";
import {
    fotosAuditoriaCampo,
    identificarAlvoAuditoriaCampo,
    montarMensagemFluidaAuditoriaCampo,
    montarPreviewNotificacaoAuditoriaCampo,
} from "../../services/auditoriaCampoService";
import { formatDate, classNames } from "../../utils/sstUtils";

export function EditorNotificacaoHistoricoAuditoria({ auditoria = {}, onAtualizada }) {
    const notificacaoInicial = auditoria.notificacao || {};
    const desvioPrincipal = Array.isArray(auditoria.desvios) ? auditoria.desvios[0] || null : null;
    const alvoAuditoria = identificarAlvoAuditoriaCampo(auditoria);
    const fotosAuditoria = fotosAuditoriaCampo(auditoria);
    const [aberto, setAberto] = useState(false);
    const [visualizarPreview, setVisualizarPreview] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [notificacao, setNotificacao] = useState({
        titulo: notificacaoInicial.titulo || `Auditoria de campo - ${alvoAuditoria.titulo}`,
        mensagem: (notificacaoInicial.mensagem && !String(notificacaoInicial.mensagem).includes("Resultado:") && !String(notificacaoInicial.mensagem).includes("Alvo auditado"))
            ? notificacaoInicial.mensagem
            : montarMensagemFluidaAuditoriaCampo(auditoria, alvoAuditoria),
        complementos: Array.isArray(notificacaoInicial.complementos) ? notificacaoInicial.complementos : [],
        auditor: notificacaoInicial.auditor || auditoria.auditorNome || "",
    });
    const [novoComplemento, setNovoComplemento] = useState("");
    const [exclusaoAberta, setExclusaoAberta] = useState(false);
    const [confirmacaoExclusao, setConfirmacaoExclusao] = useState("");
    const [senhaExclusao, setSenhaExclusao] = useState("");
    const [mostrarSenhaExclusao, setMostrarSenhaExclusao] = useState(false);
    const [motivoExclusao, setMotivoExclusao] = useState("");
    const [excluindo, setExcluindo] = useState(false);
    const [enviandoEmailAuditoria, setEnviandoEmailAuditoria] = useState(false);
    const [observacoesStatus, setObservacoesStatus] = useState({
        status: desvioPrincipal?.status || auditoria.statusDesvio || "Aberto",
        observacaoAberto: desvioPrincipal?.observacaoAberto || "",
        observacaoTratativa: desvioPrincipal?.observacaoTratativa || "",
        observacaoCorrigido: desvioPrincipal?.observacaoCorrigido || "",
    });

    const preview = useMemo(
        () => montarPreviewNotificacaoAuditoriaCampo(notificacao, notificacao.complementos),
        [notificacao]
    );
    const emailResponsavelAuditoria = String(auditoria.emailResponsavel || notificacaoInicial.emailResponsavel || "").trim();
    const whatsappResponsavelAuditoria = String(auditoria.whatsappResponsavel || notificacaoInicial.whatsappResponsavel || "").replace(/\D/g, "");
    const whatsappResponsavelFormatado = whatsappResponsavelAuditoria
        ? (whatsappResponsavelAuditoria.startsWith("55") ? whatsappResponsavelAuditoria : `55${whatsappResponsavelAuditoria}`)
        : "";
    const linkEmailAuditoria = emailResponsavelAuditoria
        ? `mailto:${emailResponsavelAuditoria}?subject=${encodeURIComponent(notificacao.titulo || "Auditoria de campo")}&body=${encodeURIComponent(preview)}`
        : "";
    const linkWhatsappAuditoria = whatsappResponsavelFormatado
        ? `https://wa.me/${whatsappResponsavelFormatado}?text=${encodeURIComponent(preview)}`
        : "";

    const enviarEmailAuditoriaAutomatico = async () => {
        if (!emailResponsavelAuditoria) {
            setMensagem("Cadastre o e-mail do responsável antes de enviar.");
            return;
        }

        setEnviandoEmailAuditoria(true);
        setMensagem("");

        try {
            const { data, error } = await supabase.functions.invoke(FUNCAO_EMAIL_ALERTA_TST, {
                body: {
                    para: emailResponsavelAuditoria,
                    assunto: notificacao.titulo || `Auditoria ${auditoria.numeroAuditoria || "de campo"}`,
                    empresa: auditoria.empresaNome || auditoria.empresaResponsavel || "Empresa não informada",
                    tstResponsavel: auditoria.responsavelTratativa || auditoria.auditorNome || "Responsável pela tratativa",
                    itens: [
                        {
                            colaborador: alvoAuditoria.titulo || auditoria.titulo || "Auditoria de campo",
                            codigo: auditoria.numeroAuditoria || "-",
                            funcao: alvoAuditoria.tipo || auditoria.tipoAuditoria || "Auditoria de campo",
                            situacaoObra: auditoria.statusAuditoria || auditoria.statusDesvio || "Aberta",
                            treinamento: auditoria.situacaoEncontrada || "Auditoria de campo",
                            realizacao: auditoria.createdAt ? formatDate(auditoria.createdAt) : formatDate(new Date()),
                            vencimento: auditoria.prazoAdequacao ? formatDate(auditoria.prazoAdequacao) : "Não informado",
                            dias: 0,
                            arquivo: preview,
                        },
                    ],
                    mensagem: preview,
                },
            });

            if (error || data?.ok === false) {
                throw new Error(error?.message || data?.erro || "Falha na função de e-mail.");
            }

            setMensagem("E-mail enviado automaticamente com sucesso.");
        } catch (error) {
            setMensagem(`Erro ao enviar e-mail: ${error.message}`);
        } finally {
            setEnviandoEmailAuditoria(false);
        }
    };

    const adicionarComplemento = () => {
        const texto = novoComplemento.trim();
        if (!texto) return;
        setNotificacao((atual) => ({
            ...atual,
            complementos: [...(atual.complementos || []), texto],
        }));
        setNovoComplemento("");
    };

    const removerComplemento = (index) => {
        setNotificacao((atual) => ({
            ...atual,
            complementos: (atual.complementos || []).filter((_, itemIndex) => itemIndex !== index),
        }));
    };

    const salvarAlteracoes = async () => {
        if (!auditoria.id) {
            setMensagem("Não foi possível salvar: auditoria sem ID.");
            return;
        }

        setSalvando(true);
        setMensagem("");

        try {
            const notificacaoPayload = {
                titulo: String(notificacao.titulo || "").trim(),
                mensagem: String(notificacao.mensagem || "").trim(),
                complementos: Array.isArray(notificacao.complementos) ? notificacao.complementos : [],
                auditor: String(notificacao.auditor || auditoria.auditorNome || "").trim(),
                atualizado_em: new Date().toISOString(),
            };

            const { error: erroAuditoria } = await supabase
                .from("auditorias_campo")
                .update({ notificacao: notificacaoPayload, auditor_nome: notificacaoPayload.auditor })
                .eq("id", auditoria.id);

            if (erroAuditoria) throw erroAuditoria;

            let desviosAtualizados = auditoria.desvios || [];

            if (desvioPrincipal?.id) {
                const desvioPayload = {
                    status: observacoesStatus.status,
                    observacao_aberto: observacoesStatus.observacaoAberto.trim(),
                    observacao_tratativa: observacoesStatus.observacaoTratativa.trim(),
                    observacao_corrigido: observacoesStatus.observacaoCorrigido.trim(),
                    notificacao: notificacaoPayload,
                };

                const { error: erroDesvio } = await supabase
                    .from("auditoria_campo_desvios")
                    .update(desvioPayload)
                    .eq("id", desvioPrincipal.id);

                if (erroDesvio) throw erroDesvio;

                desviosAtualizados = desviosAtualizados.map((desvio) =>
                    desvio.id === desvioPrincipal.id
                        ? {
                            ...desvio,
                            status: observacoesStatus.status,
                            observacaoAberto: observacoesStatus.observacaoAberto.trim(),
                            observacaoTratativa: observacoesStatus.observacaoTratativa.trim(),
                            observacaoCorrigido: observacoesStatus.observacaoCorrigido.trim(),
                            notificacao: notificacaoPayload,
                        }
                        : desvio
                );
            }

            const atualizado = {
                ...auditoria,
                notificacao: notificacaoPayload,
                auditorNome: notificacaoPayload.auditor,
                statusDesvio: observacoesStatus.status,
                desvios: desviosAtualizados,
            };

            if (typeof onAtualizada === "function") onAtualizada(atualizado);
            setMensagem("Alterações salvas com sucesso.");
        } catch (error) {
            setMensagem(`Erro ao salvar: ${error.message}`);
        } finally {
            setSalvando(false);
        }
    };

    const obterUsuarioLogadoParaExclusao = async () => {
        const { data, error } = await supabase.auth.getUser();

        if (error) {
            throw new Error(error.message || "Não foi possível identificar o usuário logado.");
        }

        const usuario = data?.user || null;

        if (!usuario?.email) {
            throw new Error("Faça login novamente antes de excluir auditorias.");
        }

        return usuario;
    };

    const verificarPermissaoExclusaoAuditoria = async (usuario) => {
        try {
            const { data, error } = await supabase.rpc("usuario_pode_acessar_auditoria");

            if (error) throw error;

            if (!data) {
                throw new Error("Seu usuário não tem permissão para excluir auditorias.");
            }
        } catch (error) {
            throw new Error(error?.message || "Não foi possível validar sua permissão para excluir auditorias.");
        }

        try {
            const { data, error } = await supabase
                .from("auditoria_usuarios_autorizados")
                .select("email, nome, perfil, ativo, acesso_global, pode_acessar_auditoria")
                .eq("email", String(usuario.email || "").trim().toLowerCase())
                .maybeSingle();

            if (error) {
                console.warn("Não foi possível conferir o cadastro de permissão da auditoria:", error.message || error);
                return;
            }

            if (data && (data.ativo === false || data.pode_acessar_auditoria === false)) {
                throw new Error("Seu acesso à Auditoria de sistema está bloqueado.");
            }
        } catch (error) {
            throw new Error(error?.message || "Não foi possível validar o usuário autorizado.");
        }
    };

    const validarSenhaUsuarioExclusao = async (usuario) => {
        const senhaTratada = String(senhaExclusao || "").trim();

        if (!senhaTratada) {
            throw new Error("Informe a senha do usuário logado para confirmar a exclusão.");
        }

        const { error } = await supabase.auth.signInWithPassword({
            email: usuario.email,
            password: senhaTratada,
        });

        if (error) {
            throw new Error("Senha do usuário logado inválida. Exclusão bloqueada.");
        }
    };

    const registrarExclusaoAuditoriaSistema = async ({ usuario, motivo }) => {
        const descricao = [
            `Auditoria de campo excluída por ${usuario.email}.`,
            `Auditoria: ${auditoria.numeroAuditoria || auditoria.id}.`,
            `Alvo: ${alvoAuditoria.titulo || auditoria.titulo || "Não informado"}.`,
            motivo ? `Motivo: ${motivo}.` : "Motivo não informado.",
        ].join(" ");

        const payloadCompleto = {
            acao: "DELETE",
            tabela: "auditorias_campo",
            descricao,
            usuario_email: usuario.email,
            usuario_id: usuario.id,
            registro_id: String(auditoria.id),
            detalhes: {
                auditoriaId: auditoria.id,
                numeroAuditoria: auditoria.numeroAuditoria || auditoria.numero_auditoria || "",
                alvo: alvoAuditoria.titulo || auditoria.titulo || "",
                motivo,
                confirmadoPorSenha: true,
                excluidoEm: new Date().toISOString(),
            },
        };

        const payloadMinimo = {
            acao: "DELETE",
            tabela: "auditorias_campo",
            descricao,
        };

        try {
            const { error } = await supabase.from("auditoria_sistema").insert(payloadCompleto);

            if (!error) return;

            const { error: erroFallback } = await supabase.from("auditoria_sistema").insert(payloadMinimo);

            if (erroFallback) {
                console.warn("Não foi possível registrar log manual de exclusão da auditoria:", erroFallback.message || erroFallback);
            }
        } catch (error) {
            console.warn("Não foi possível registrar log manual de exclusão da auditoria:", error?.message || error);
        }
    };

    const excluirAuditoria = async () => {
        if (!auditoria.id) {
            setMensagem("Não foi possível excluir: auditoria sem ID.");
            return;
        }

        if (confirmacaoExclusao.trim().toUpperCase() !== "EXCLUIR") {
            setMensagem("Digite EXCLUIR para confirmar a exclusão.");
            return;
        }

        const motivoTratado = motivoExclusao.trim();

        if (!motivoTratado) {
            setMensagem("Informe o motivo da exclusão para manter a rastreabilidade.");
            return;
        }

        const confirmou = window.confirm("Confirma a exclusão definitiva desta auditoria de campo? A senha do usuário logado será validada antes da remoção.");
        if (!confirmou) return;

        setExcluindo(true);
        setMensagem("");

        try {
            const usuario = await obterUsuarioLogadoParaExclusao();

            await verificarPermissaoExclusaoAuditoria(usuario);
            await validarSenhaUsuarioExclusao(usuario);
            await registrarExclusaoAuditoriaSistema({ usuario, motivo: motivoTratado });

            const { error: erroDesvios } = await supabase
                .from("auditoria_campo_desvios")
                .delete()
                .eq("auditoria_id", auditoria.id);

            if (erroDesvios) throw erroDesvios;

            const { error: erroAuditoria } = await supabase
                .from("auditorias_campo")
                .delete()
                .eq("id", auditoria.id);

            if (erroAuditoria) throw erroAuditoria;

            if (typeof onAtualizada === "function") {
                onAtualizada({
                    ...auditoria,
                    excluida: true,
                    excluidaPor: usuario.email,
                    motivoExclusao: motivoTratado,
                });
            }

            setConfirmacaoExclusao("");
            setSenhaExclusao("");
            setMotivoExclusao("");
            setMensagem(`Auditoria excluída com sucesso por ${usuario.email}.`);
        } catch (error) {
            setMensagem(`Erro ao excluir auditoria: ${error.message}`);
        } finally {
            setExcluindo(false);
        }
    };

    return (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-bold text-slate-900">Notificação e tratativa</p>
                    <p className="text-xs text-slate-500">Edite a notificação, complementos e observações por status desta auditoria.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <button
                        type="button"
                        onClick={() => setVisualizarPreview((valor) => !valor)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                    >
                        <Eye className="h-3.5 w-3.5" />
                        {visualizarPreview ? "Ocultar visualização" : "Visualizar"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setAberto((valor) => !valor)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    >
                        {aberto ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {aberto ? "Fechar edição" : "Editar"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setExclusaoAberta((valor) => !valor)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                    </button>
                </div>
            </div>

            {exclusaoAberta && (
                <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-sm font-bold text-red-800">Excluir auditoria</p>
                            <p className="mt-1 text-xs text-red-700">Esta ação remove a auditoria e seus desvios vinculados. Informe o motivo, digite EXCLUIR e confirme com a senha do usuário logado.</p>
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-red-700 ring-1 ring-red-100">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Validação obrigatória
                        </div>
                    </div>

                    <div className="mt-3 grid gap-2 lg:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
                        <input
                            value={motivoExclusao}
                            onChange={(e) => setMotivoExclusao(e.target.value)}
                            placeholder="Motivo da exclusão"
                            className="min-w-0 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-red-100"
                        />
                        <input
                            value={confirmacaoExclusao}
                            onChange={(e) => setConfirmacaoExclusao(e.target.value)}
                            placeholder="Digite EXCLUIR"
                            className="min-w-0 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-red-100"
                        />
                        <div className="relative min-w-0">
                            <input
                                type={mostrarSenhaExclusao ? "text" : "password"}
                                value={senhaExclusao}
                                onChange={(e) => setSenhaExclusao(e.target.value)}
                                placeholder="Senha do usuário"
                                className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 pr-11 text-sm outline-none focus:ring-4 focus:ring-red-100"
                            />
                            <button
                                type="button"
                                onClick={() => setMostrarSenhaExclusao((valor) => !valor)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-red-500 hover:bg-red-50"
                                title={mostrarSenhaExclusao ? "Ocultar senha" : "Mostrar senha"}
                            >
                                {mostrarSenhaExclusao ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                        <button
                            type="button"
                            disabled={excluindo}
                            onClick={excluirAuditoria}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                        >
                            {excluindo ? <Lock className="h-4 w-4 animate-pulse" /> : <Trash2 className="h-4 w-4" />}
                            {excluindo ? "Validando..." : "Confirmar exclusão"}
                        </button>
                    </div>

                    <p className="mt-2 text-[11px] font-semibold text-red-700">A exclusão só continua se o usuário estiver logado, autorizado na Auditoria de sistema e a senha informada estiver correta.</p>
                </div>
            )}

            {visualizarPreview && !aberto && (
                <PreviaNotificacaoAuditoriaCampo
                    auditoria={auditoria}
                    notificacao={notificacao}
                    observacoesStatus={observacoesStatus}
                    alvoAuditoria={alvoAuditoria}
                    preview={preview}
                />
            )}

            {aberto && (
                <div className="mt-4 space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Auditoria</p>
                            <p className="mt-1 text-sm font-black text-slate-900">{auditoria.numeroAuditoria || "Sem número"}</p>
                        </div>
                        <div className="rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-100">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600">Alvo</p>
                            <p className="mt-1 text-sm font-black text-blue-950">{alvoAuditoria.tipo}</p>
                        </div>
                        <div className="rounded-2xl bg-orange-50 p-3 ring-1 ring-orange-100">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-orange-600">Risco</p>
                            <p className="mt-1 text-sm font-black text-orange-950">{auditoria.grauRisco || "Não informado"}</p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">Resultado</p>
                            <p className="mt-1 text-sm font-black text-emerald-950">{auditoria.classificacao || "Sem classificação"} · {auditoria.pontuacao || 0}%</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Responsável</p>
                            <p className="mt-1 text-sm font-black text-slate-900">{auditoria.responsavelTratativa || "Não informado"}</p>
                        </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Nome de quem fez a auditoria</label>
                                <input
                                    value={notificacao.auditor}
                                    onChange={(e) => setNotificacao((atual) => ({ ...atual, auditor: e.target.value }))}
                                    placeholder="Auditor responsável"
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Assunto da notificação</label>
                                <input
                                    value={notificacao.titulo}
                                    onChange={(e) => setNotificacao((atual) => ({ ...atual, titulo: e.target.value }))}
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Mensagem</label>
                                <textarea
                                    value={notificacao.mensagem}
                                    onChange={(e) => setNotificacao((atual) => ({ ...atual, mensagem: e.target.value }))}
                                    rows={4}
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Adicionar complemento</label>
                                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                    <input
                                        value={novoComplemento}
                                        onChange={(e) => setNovoComplemento(e.target.value)}
                                        placeholder="Ex.: Reforçar tema em DDS da equipe"
                                        className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={adicionarComplemento}
                                        className="inline-flex items-center gap-1 rounded-2xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Adicionar
                                    </button>
                                </div>
                            </div>

                            {(notificacao.complementos || []).length > 0 && (
                                <div className="space-y-2">
                                    {(notificacao.complementos || []).map((item, index) => (
                                        <div key={`${item}-${index}`} className="flex items-start justify-between gap-2 rounded-2xl bg-slate-50 p-2 text-sm text-slate-700 ring-1 ring-slate-200">
                                            <span>{index + 1}. {item}</span>
                                            <button
                                                type="button"
                                                onClick={() => removerComplemento(index)}
                                                className="rounded-xl bg-white p-2 text-red-600 ring-1 ring-red-100 hover:bg-red-50"
                                                title="Excluir complemento"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Enviar auditoria para responsável</p>
                                <p className="mt-1 text-xs text-slate-500">Envie automaticamente por e-mail ou abra a mensagem pronta no WhatsApp.</p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {emailResponsavelAuditoria ? (
                                        <button type="button" disabled={enviandoEmailAuditoria} onClick={enviarEmailAuditoriaAutomatico} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50 disabled:opacity-60">
                                            <Mail className="h-4 w-4" />
                                            {enviandoEmailAuditoria ? "Enviando..." : "Enviar e-mail"}
                                        </button>
                                    ) : (
                                        <button type="button" disabled className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-400 ring-1 ring-slate-200">
                                            <Mail className="h-4 w-4" />
                                            Sem e-mail
                                        </button>
                                    )}
                                    {linkWhatsappAuditoria ? (
                                        <a href={linkWhatsappAuditoria} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                                            <MessageCircle className="h-4 w-4" />
                                            WhatsApp
                                        </a>
                                    ) : (
                                        <button type="button" disabled className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-400 ring-1 ring-slate-200">
                                            <MessageCircle className="h-4 w-4" />
                                            Sem WhatsApp
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-bold text-blue-950">Prévia da notificação</p>
                                        <p className="text-xs text-blue-700">Visualize em formato de relatório antes de registrar ou reenviar a tratativa.</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setVisualizarPreview((valor) => !valor)}
                                        className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-blue-700 ring-1 ring-blue-200"
                                    >
                                        {visualizarPreview ? "Ocultar" : "Visualizar"}
                                    </button>
                                </div>
                                {visualizarPreview && (
                                    <PreviaNotificacaoAuditoriaCampo
                                        auditoria={auditoria}
                                        notificacao={notificacao}
                                        observacoesStatus={observacoesStatus}
                                        alvoAuditoria={alvoAuditoria}
                                        preview={preview}
                                    />
                                )}
                            </div>

                            <div className="rounded-2xl border border-slate-200 p-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Status do desvio</label>
                                        <select
                                            value={observacoesStatus.status}
                                            onChange={(e) => setObservacoesStatus((atual) => ({ ...atual, status: e.target.value }))}
                                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                        >
                                            {statusDesvioAuditoriaCampo.map((status) => <option key={status}>{status}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-3 grid gap-3 md:grid-cols-3">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wide text-red-600">Observação — Aberto</label>
                                        <textarea
                                            value={observacoesStatus.observacaoAberto}
                                            onChange={(e) => setObservacoesStatus((atual) => ({ ...atual, observacaoAberto: e.target.value }))}
                                            rows={3}
                                            className="mt-2 w-full rounded-2xl border border-red-100 bg-red-50/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-red-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wide text-orange-600">Observação — Em tratativa</label>
                                        <textarea
                                            value={observacoesStatus.observacaoTratativa}
                                            onChange={(e) => setObservacoesStatus((atual) => ({ ...atual, observacaoTratativa: e.target.value }))}
                                            rows={3}
                                            className="mt-2 w-full rounded-2xl border border-orange-100 bg-orange-50/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-orange-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wide text-emerald-600">Observação — Corrigido</label>
                                        <textarea
                                            value={observacoesStatus.observacaoCorrigido}
                                            onChange={(e) => setObservacoesStatus((atual) => ({ ...atual, observacaoCorrigido: e.target.value }))}
                                            rows={3}
                                            className="mt-2 w-full rounded-2xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-100"
                                        />
                                    </div>
                                </div>
                            </div>

                            {(fotosAuditoria.antes || fotosAuditoria.depois) && (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">Fotos anexadas</p>
                                            <p className="text-xs text-slate-500">Evidências vinculadas à auditoria ou ao desvio principal.</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        <FotoAuditoriaPreview url={fotosAuditoria.antes} label="Foto antes" />
                                        <FotoAuditoriaPreview url={fotosAuditoria.depois} label="Foto depois" />
                                    </div>
                                </div>
                            )}

                            {mensagem && (
                                <div className={classNames("rounded-2xl px-3 py-2 text-xs font-bold ring-1", mensagem.includes("Erro") || mensagem.includes("Não foi possível") ? "bg-red-50 text-red-700 ring-red-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200")}>
                                    {mensagem}
                                </div>
                            )}

                            <button
                                type="button"
                                disabled={salvando}
                                onClick={salvarAlteracoes}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                {salvando ? "Salvando..." : "Salvar notificação e observações"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
