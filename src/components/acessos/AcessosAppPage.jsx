import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    KeyRound,
    LockKeyhole,
    RefreshCw,
    ShieldCheck,
    UserCog,
    UserPlus,
    UsersRound,
} from "lucide-react";
import { Card } from "../commonComponents";
import {
    ACOES_USUARIOS_PERMISSOES_PLANEJADAS,
    PERFIS_USUARIOS_PERMISSOES_PLANEJADOS,
    PERMISSOES_PADRAO_USUARIOS_POR_PERFIL,
} from "../../constants/usuariosPermissoesConstants";
import { supabase } from "../../lib/supabaseClient";
import { criarLoginAppComSenhaTemporariaService } from "../../services/acessosAppService";
import {
    concluirSolicitacaoAcessoSistemaService,
    listarSolicitacoesAcessoSistemaService,
    listarUsuariosPermissoesSistemaService,
    responderSolicitacaoAcessoSistemaService,
    salvarUsuarioPermissaoSistemaService,
} from "../../services/usuariosPermissoesSistemaService";

const CARDS_ACESSOS_APP = [
    {
        titulo: "Cadastro de login",
        descricao: "Criar pessoa, definir e-mail, função, perfil e senha temporária.",
        status: "Login integrado",
        icone: UserPlus,
    },
    {
        titulo: "Usuários cadastrados",
        descricao: "Listar pessoas com acesso, editar perfil e acompanhar status ativo ou bloqueado.",
        status: "Concluído",
        icone: UsersRound,
    },
    {
        titulo: "Solicitações de acesso",
        descricao: "Aprovar, recusar ou concluir pedidos feitos pelas telas restritas.",
        status: "Concluído",
        icone: ClipboardList,
    },
    {
        titulo: "Perfis padrão",
        descricao: "Revisar o que Administrador, Técnico SST, Auditor, Gestor, Consulta e Bloqueado podem fazer.",
        status: "Concluído",
        icone: ShieldCheck,
    },
    {
        titulo: "Segurança e logs",
        descricao: "Registrar criação, alteração, bloqueio, desbloqueio e uso de senha temporária.",
        status: "Preparação",
        icone: LockKeyhole,
    },
];

function obterNomeUsuario(usuario) {
    const nome = String(usuario?.nome || usuario?.user_metadata?.nome || "").trim();
    const email = String(usuario?.email || "").trim();

    if (nome) return nome;
    if (email.includes("@")) return email.split("@")[0];
    return "Administrador";
}

function BadgeEtapa({ children, variante = "info" }) {
    const classes = {
        info: "bg-blue-50 text-blue-700 ring-blue-100",
        alerta: "bg-orange-50 text-orange-700 ring-orange-100",
        sucesso: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        neutro: "bg-slate-50 text-slate-600 ring-slate-200",
    };

    return (
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${classes[variante] || classes.info}`}>
            {children}
        </span>
    );
}

function CardFuncionalidade({ item, indice }) {
    const Icone = item.icone;
    const statusSucesso = item.status === "Concluído";
    const statusAlerta = indice === 0 && !statusSucesso;

    return (
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                        <Icone className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Etapa {indice + 1}</p>
                        <h3 className="mt-1 text-base font-black text-slate-950">{item.titulo}</h3>
                    </div>
                </div>
                <BadgeEtapa variante={statusSucesso ? "sucesso" : statusAlerta ? "alerta" : "info"}>{item.status}</BadgeEtapa>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">{item.descricao}</p>
        </article>
    );
}


function normalizarTextoAcesso(valor) {
    return String(valor || "").trim();
}

function formatarPerfilAcessoApp(perfil = "") {
    const mapa = {
        administrador: "Administrador",
        tecnico_sst: "Técnico SST",
        auditor: "Auditor",
        gestor: "Gestor",
        consulta: "Consulta",
        bloqueado: "Bloqueado",
    };

    const chave = normalizarTextoAcesso(perfil).toLowerCase();
    return mapa[chave] || normalizarTextoAcesso(perfil).replace(/_/g, " ") || "Sem perfil";
}

function formatarStatusAcessoApp(usuarioPermissao = {}) {
    if (usuarioPermissao?.bloqueado) return "Bloqueado";
    if (usuarioPermissao?.ativo) return "Ativo";
    return "Inativo";
}

function obterClassePerfilAcessoApp(perfil = "") {
    const chave = normalizarTextoAcesso(perfil).toLowerCase();

    if (chave === "administrador") return "bg-blue-50 text-blue-700 ring-blue-100";
    if (chave === "tecnico_sst") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    if (chave === "auditor") return "bg-violet-50 text-violet-700 ring-violet-100";
    if (chave === "gestor") return "bg-cyan-50 text-cyan-700 ring-cyan-100";
    if (chave === "bloqueado") return "bg-rose-50 text-rose-700 ring-rose-100";

    return "bg-slate-50 text-slate-600 ring-slate-200";
}

function obterClasseStatusAcessoApp(usuarioPermissao = {}) {
    if (usuarioPermissao?.bloqueado) return "bg-rose-50 text-rose-700 ring-rose-100";
    if (usuarioPermissao?.ativo) return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    return "bg-slate-50 text-slate-600 ring-slate-200";
}

function emailEhUsuarioAtualAcessoApp(email = "", usuario = null) {
    const emailLista = normalizarTextoAcesso(email).toLowerCase();
    const emailAtual = normalizarTextoAcesso(usuario?.email).toLowerCase();
    return Boolean(emailLista && emailAtual && emailLista === emailAtual);
}

const FORM_USUARIO_ACESSO_INICIAL = {
    id: null,
    nome: "",
    email: "",
    funcao: "",
    perfil: "consulta",
    ativo: true,
    bloqueado: false,
    acesso_global: false,
    observacao: "",
    senhaTemporaria: "",
    confirmarSenhaTemporaria: "",
    resetarSenhaTemporaria: false,
};

function montarFormularioUsuarioAcesso(usuario = null) {
    if (!usuario) return { ...FORM_USUARIO_ACESSO_INICIAL };

    const perfil = normalizarTextoAcesso(usuario.perfil || "consulta").toLowerCase() || "consulta";
    const bloqueado = perfil === "bloqueado" ? true : Boolean(usuario.bloqueado);
    const ativo = perfil === "bloqueado" ? false : Boolean(usuario.ativo);

    return {
        id: usuario.id || null,
        nome: usuario.nome || "",
        email: normalizarTextoAcesso(usuario.email).toLowerCase(),
        funcao: usuario.funcao || "",
        perfil,
        ativo,
        bloqueado,
        acesso_global: perfil === "administrador" ? Boolean(usuario.acesso_global) : false,
        observacao: usuario.observacao || "",
        senhaTemporaria: "",
        confirmarSenhaTemporaria: "",
        resetarSenhaTemporaria: false,
    };
}


function obterClasseStatusSolicitacaoAcessoApp(status = "pendente") {
    const statusTratado = normalizarTextoAcesso(status).toLowerCase();

    if (statusTratado === "aprovada") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
    if (statusTratado === "recusada") return "bg-rose-50 text-rose-700 ring-rose-100";
    if (statusTratado === "concluida") return "bg-blue-50 text-blue-700 ring-blue-100";
    if (statusTratado === "cancelada") return "bg-slate-100 text-slate-500 ring-slate-200";
    return "bg-amber-50 text-amber-800 ring-amber-100";
}

function formatarStatusSolicitacaoAcessoApp(status = "pendente") {
    const mapa = {
        pendente: "Pendente",
        aprovada: "Aprovada",
        recusada: "Recusada",
        concluida: "Concluída",
        cancelada: "Cancelada",
    };

    return mapa[normalizarTextoAcesso(status).toLowerCase()] || "Pendente";
}

function formatarDataHoraAcessoApp(valor) {
    if (!valor) return "data não informada";

    try {
        return new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(valor));
    } catch {
        return String(valor || "");
    }
}

function SolicitacoesAcessoApp({ onPrepararPermissao = null }) {
    const [solicitacoes, setSolicitacoes] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [mensagem, setMensagem] = useState("Solicitações ainda não carregadas.");
    const [erro, setErro] = useState("");
    const [respostaAdmin, setRespostaAdmin] = useState("");
    const [processandoId, setProcessandoId] = useState("");

    const resumo = useMemo(() => ({
        total: solicitacoes.length,
        pendentes: solicitacoes.filter((item) => item.status === "pendente").length,
        aprovadas: solicitacoes.filter((item) => item.status === "aprovada").length,
        concluidas: solicitacoes.filter((item) => item.status === "concluida").length,
        recusadas: solicitacoes.filter((item) => item.status === "recusada").length,
    }), [solicitacoes]);

    async function carregarSolicitacoes() {
        if (carregando) return;

        setCarregando(true);
        setErro("");
        setMensagem("Consultando solicitações de acesso no Supabase...");

        try {
            const lista = await listarSolicitacoesAcessoSistemaService({ supabase });
            setSolicitacoes(lista);
            setMensagem(lista.length ? `${lista.length} solicitação(ões) carregada(s).` : "Nenhuma solicitação de acesso encontrada.");
        } catch (error) {
            setSolicitacoes([]);
            setErro(error?.message || "Não foi possível carregar solicitações de acesso.");
            setMensagem("A lista não foi carregada. Confirme se o usuário atual possui permissão administrativa.");
        } finally {
            setCarregando(false);
        }
    }

    async function responderSolicitacao(solicitacao, statusResposta) {
        if (!solicitacao?.id || processandoId) return;

        const textoAcao = statusResposta === "aprovada" ? "Aprovando" : statusResposta === "recusada" ? "Recusando" : "Concluindo";
        setProcessandoId(solicitacao.id);
        setErro("");
        setMensagem(`${textoAcao} solicitação de ${solicitacao.email || "usuário sem e-mail"}...`);

        try {
            const atualizada = statusResposta === "concluida"
                ? await concluirSolicitacaoAcessoSistemaService({
                    supabase,
                    solicitacaoId: solicitacao.id,
                    respostaAdmin,
                })
                : await responderSolicitacaoAcessoSistemaService({
                    supabase,
                    solicitacaoId: solicitacao.id,
                    status: statusResposta,
                    respostaAdmin,
                });

            setSolicitacoes((listaAtual) => listaAtual.map((item) => (
                item.id === solicitacao.id ? { ...item, ...(atualizada || {}), status: atualizada?.status || statusResposta } : item
            )));
            setMensagem(`Solicitação ${formatarStatusSolicitacaoAcessoApp(statusResposta).toLowerCase()} com sucesso. Para solicitação aprovada, use Preparar permissão e depois Criar login do app.`);
        } catch (error) {
            setErro(error?.message || "Não foi possível atualizar a solicitação de acesso.");
            setMensagem("A solicitação não foi atualizada.");
        } finally {
            setProcessandoId("");
        }
    }

    useEffect(() => {
        carregarSolicitacoes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <Card className="border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                        <ClipboardList className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Solicitações de acesso</p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">Pedidos feitos nas telas restritas</h3>
                        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                            Esta seção foi movida de Configurações para Acessos do App. Aprove, recuse ou conclua solicitações antes da etapa de edição completa de permissões.
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-500">{mensagem}</p>
                        {erro ? <p className="mt-2 rounded-2xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-100">{erro}</p> : null}
                    </div>
                </div>
                <button
                    type="button"
                    onClick={carregarSolicitacoes}
                    disabled={carregando}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm ring-1 ring-slate-950 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} />
                    {carregando ? "Carregando" : "Atualizar solicitações"}
                </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Total</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{resumo.total}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Pendentes</p>
                    <p className="mt-1 text-xl font-black text-amber-800">{resumo.pendentes}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Aprovadas</p>
                    <p className="mt-1 text-xl font-black text-emerald-800">{resumo.aprovadas}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">Concluídas</p>
                    <p className="mt-1 text-xl font-black text-blue-800">{resumo.concluidas}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">Recusadas</p>
                    <p className="mt-1 text-xl font-black text-rose-800">{resumo.recusadas}</p>
                </div>
            </div>

            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                <label className="block text-xs font-black uppercase tracking-wide text-slate-400">
                    Observação do administrador
                </label>
                <textarea
                    value={respostaAdmin}
                    onChange={(evento) => setRespostaAdmin(evento.target.value)}
                    disabled={Boolean(processandoId)}
                    rows={2}
                    placeholder="Exemplo: aprovado para teste operacional, recusado por falta de vínculo, aguardar validação..."
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                />
            </div>

            <div className="mt-5 space-y-2">
                {solicitacoes.length > 0 ? solicitacoes.map((item) => (
                    <article key={item.id || `${item.email}-${item.criado_em}`} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-950">{item.nome || "Usuário sem nome"}</p>
                                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.email || "email não informado"}</p>
                                <p className="mt-1 text-[11px] font-semibold text-slate-400">{formatarDataHoraAcessoApp(item.criado_em)}</p>
                                {item.observacao ? <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-500">{item.observacao}</p> : null}
                            </div>
                            <div className="flex flex-wrap gap-2 xl:justify-end">
                                <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                                    Área: {item.area_solicitada || item.tela || "não informada"}
                                </span>
                                <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                                    Perfil atual: {item.perfil_atual || "não informado"}
                                </span>
                                <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${obterClasseStatusSolicitacaoAcessoApp(item.status)}`}>
                                    {formatarStatusSolicitacaoAcessoApp(item.status)}
                                </span>
                                {item.status === "pendente" ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => responderSolicitacao(item, "aprovada")}
                                            disabled={processandoId === item.id}
                                            className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {processandoId === item.id ? "Processando" : "Aprovar"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => responderSolicitacao(item, "recusada")}
                                            disabled={processandoId === item.id}
                                            className="rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 ring-1 ring-rose-100 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Recusar
                                        </button>
                                    </>
                                ) : null}
                                {item.status === "aprovada" ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => onPrepararPermissao?.(item)}
                                            className="rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100"
                                        >
                                            Preparar permissão
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => responderSolicitacao(item, "concluida")}
                                            disabled={processandoId === item.id}
                                            className="rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Concluir
                                        </button>
                                    </>
                                ) : null}
                            </div>
                        </div>
                    </article>
                )) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                        Nenhuma solicitação carregada. Clique em Atualizar solicitações para consultar a lista administrativa.
                    </div>
                )}
            </div>
        </Card>
    );
}

function UsuariosCadastradosApp({ usuario = null, usuarioParaEditar = null, onEdicaoConsumida = null }) {
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [mensagem, setMensagem] = useState("Usuários ainda não carregados.");
    const [erro, setErro] = useState("");
    const [formulario, setFormulario] = useState(() => montarFormularioUsuarioAcesso());
    const [formAberto, setFormAberto] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [criandoLogin, setCriandoLogin] = useState(false);

    const resumo = useMemo(() => ({
        total: usuarios.length,
        ativos: usuarios.filter((item) => item.ativo && !item.bloqueado).length,
        administradores: usuarios.filter((item) => item.perfil === "administrador").length,
        bloqueados: usuarios.filter((item) => item.bloqueado).length,
    }), [usuarios]);

    async function carregarUsuarios() {
        if (carregando) return;

        setCarregando(true);
        setErro("");
        setMensagem("Consultando usuários e permissões no Supabase...");

        try {
            const lista = await listarUsuariosPermissoesSistemaService({ supabase });
            setUsuarios(lista);
            setMensagem(lista.length ? `${lista.length} pessoa(s) carregada(s) da lista administrativa de acessos.` : "Nenhum usuário cadastrado encontrado.");
        } catch (error) {
            setUsuarios([]);
            setErro(error?.message || "Não foi possível carregar usuários cadastrados.");
            setMensagem("A lista não foi carregada. Confirme se o usuário atual possui permissão administrativa.");
        } finally {
            setCarregando(false);
        }
    }

    function abrirCadastroVazio() {
        setFormulario(montarFormularioUsuarioAcesso());
        setFormAberto(true);
        setErro("");
        setMensagem("Preencha os dados, informe uma senha temporária e use Criar login do app para criar o acesso real no Supabase Auth.");
    }

    function iniciarEdicao(item) {
        setFormulario(montarFormularioUsuarioAcesso(item));
        setFormAberto(true);
        setErro("");
        setMensagem(`Editando permissão de ${item?.email || "usuário selecionado"}.`);
    }

    function atualizarCampoFormulario(campo, valor) {
        setFormulario((atual) => {
            const proximo = { ...atual, [campo]: valor };

            if (campo === "perfil") {
                proximo.perfil = valor;

                if (valor === "bloqueado") {
                    proximo.ativo = false;
                    proximo.bloqueado = true;
                    proximo.acesso_global = false;
                }

                if (valor !== "administrador") {
                    proximo.acesso_global = false;
                }
            }

            if (campo === "bloqueado" && valor === true) {
                proximo.ativo = false;
                proximo.acesso_global = false;
            }

            if (campo === "ativo" && valor === true && proximo.perfil !== "bloqueado") {
                proximo.bloqueado = false;
            }

            if (campo === "acesso_global" && proximo.perfil !== "administrador") {
                proximo.acesso_global = false;
            }

            return proximo;
        });
    }

    async function criarLoginDoApp() {
        if (criandoLogin || salvando) return;

        const emailTratado = normalizarTextoAcesso(formulario.email).toLowerCase();
        const senhaTemporaria = String(formulario.senhaTemporaria || "");
        const confirmarSenhaTemporaria = String(formulario.confirmarSenhaTemporaria || "");

        if (!formulario.nome?.trim()) {
            setErro("Informe o nome da pessoa para criar o login.");
            return;
        }

        if (!emailTratado || !emailTratado.includes("@")) {
            setErro("Informe um e-mail válido para criar o login.");
            return;
        }

        if (senhaTemporaria.length < 6) {
            setErro("A senha temporária deve ter pelo menos 6 caracteres.");
            return;
        }

        if (senhaTemporaria !== confirmarSenhaTemporaria) {
            setErro("A confirmação da senha temporária não confere.");
            return;
        }

        if (formulario.acesso_global && formulario.perfil !== "administrador") {
            setErro("Acesso global só pode ser liberado para perfil Administrador.");
            return;
        }

        const confirmar = window.confirm(
            `Criar login real no app para ${emailTratado}? A pessoa acessará com a senha temporária e deverá trocá-la no primeiro acesso.`
        );

        if (!confirmar) return;

        setCriandoLogin(true);
        setErro("");
        setMensagem(`Criando login real de ${emailTratado} no Supabase Auth...`);

        try {
            const resultado = await criarLoginAppComSenhaTemporariaService({
                supabase,
                dados: {
                    ...formulario,
                    email: emailTratado,
                },
            });

            const permissaoSalva = resultado?.permissao || resultado?.usuario || null;

            if (permissaoSalva?.email || emailTratado) {
                const registro = {
                    ...formulario,
                    ...(permissaoSalva || {}),
                    email: permissaoSalva?.email || emailTratado,
                    nome: permissaoSalva?.nome || formulario.nome,
                    funcao: permissaoSalva?.funcao || formulario.funcao,
                    perfil: permissaoSalva?.perfil || formulario.perfil,
                    ativo: permissaoSalva?.ativo ?? formulario.ativo,
                    bloqueado: permissaoSalva?.bloqueado ?? formulario.bloqueado,
                    acesso_global: permissaoSalva?.acesso_global ?? permissaoSalva?.acessoGlobal ?? formulario.acesso_global,
                    precisa_trocar_senha: true,
                };

                setUsuarios((listaAtual) => {
                    const existe = listaAtual.some((item) => item.email === registro.email || item.id === registro.id);

                    if (existe) {
                        return listaAtual.map((item) => (
                            item.email === registro.email || item.id === registro.id ? { ...item, ...registro } : item
                        ));
                    }

                    return [registro, ...listaAtual];
                });

                setFormulario({
                    ...montarFormularioUsuarioAcesso(registro),
                    senhaTemporaria: "",
                    confirmarSenhaTemporaria: "",
                    resetarSenhaTemporaria: false,
                });
            }

            setMensagem(resultado?.mensagem || "Login criado/atualizado com sucesso. O usuário deve trocar a senha temporária no primeiro acesso.");
        } catch (error) {
            setErro(error?.message || "Não foi possível criar o login do app.");
            setMensagem("O login não foi criado.");
        } finally {
            setCriandoLogin(false);
        }
    }

    async function salvarPermissaoEditada(evento) {
        evento?.preventDefault?.();
        if (salvando) return;

        const emailTratado = normalizarTextoAcesso(formulario.email).toLowerCase();

        if (!emailTratado || !emailTratado.includes("@")) {
            setErro("Informe um e-mail válido para salvar a permissão.");
            return;
        }

        if (formulario.acesso_global && formulario.perfil !== "administrador") {
            setErro("Acesso global só pode ser liberado para perfil Administrador.");
            return;
        }

        setSalvando(true);
        setErro("");
        setMensagem(`Salvando permissão de ${emailTratado}...`);

        try {
            const salvo = await salvarUsuarioPermissaoSistemaService({
                supabase,
                usuario: {
                    ...formulario,
                    email: emailTratado,
                },
                usuarioAtual: usuario,
            });

            if (salvo?.email) {
                setUsuarios((listaAtual) => {
                    const existe = listaAtual.some((item) => item.email === salvo.email || item.id === salvo.id);

                    if (existe) {
                        return listaAtual.map((item) => (
                            item.email === salvo.email || item.id === salvo.id ? { ...item, ...salvo } : item
                        ));
                    }

                    return [salvo, ...listaAtual];
                });
                setFormulario(montarFormularioUsuarioAcesso(salvo));
            }

            setMensagem("Permissão salva com sucesso. Para criar ou redefinir login real, use o botão Criar login do app com senha temporária.");
        } catch (error) {
            setErro(error?.message || "Não foi possível salvar a permissão do usuário.");
            setMensagem("A permissão não foi salva.");
        } finally {
            setSalvando(false);
        }
    }

    useEffect(() => {
        carregarUsuarios();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!usuarioParaEditar) return;

        setFormulario(montarFormularioUsuarioAcesso({
            nome: usuarioParaEditar.nome || "",
            email: usuarioParaEditar.email || "",
            funcao: usuarioParaEditar.area_solicitada || usuarioParaEditar.tela || "",
            perfil: usuarioParaEditar.perfil_atual === "Usuário sem perfil liberado" ? "consulta" : usuarioParaEditar.perfil_atual || "consulta",
            ativo: true,
            bloqueado: false,
            acesso_global: false,
            observacao: usuarioParaEditar.observacao || usuarioParaEditar.resposta_admin || "Permissão preparada a partir de solicitação de acesso aprovada.",
            senhaTemporaria: "",
            confirmarSenhaTemporaria: "",
            resetarSenhaTemporaria: false,
        }));
        setFormAberto(true);
        setMensagem(`Preparando permissão para ${usuarioParaEditar.email || "solicitação aprovada"}. Revise o perfil antes de salvar.`);
        onEdicaoConsumida?.();
    }, [usuarioParaEditar, onEdicaoConsumida]);

    return (
        <Card className="border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                        <UsersRound className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Usuários cadastrados</p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">Lista de pessoas com acesso ao app</h3>
                        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                            Crie login real com senha temporária pela Edge Function segura e mantenha perfil, status, função e permissões pelo Supabase/RPC.
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-500">{mensagem}</p>
                        {erro ? <p className="mt-2 rounded-2xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-100">{erro}</p> : null}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                        type="button"
                        onClick={abrirCadastroVazio}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-50 px-4 py-2 text-xs font-black text-blue-700 shadow-sm ring-1 ring-blue-100 hover:bg-blue-100"
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        Cadastrar login
                    </button>
                    <button
                        type="button"
                        onClick={carregarUsuarios}
                        disabled={carregando}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm ring-1 ring-slate-950 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} />
                        {carregando ? "Carregando" : "Atualizar usuários"}
                    </button>
                </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Total</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{resumo.total}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Ativos</p>
                    <p className="mt-1 text-xl font-black text-emerald-800">{resumo.ativos}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">Administradores</p>
                    <p className="mt-1 text-xl font-black text-blue-800">{resumo.administradores}</p>
                </div>
                <div className="rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">Bloqueados</p>
                    <p className="mt-1 text-xl font-black text-rose-800">{resumo.bloqueados}</p>
                </div>
            </div>

            {formAberto ? (
                <form onSubmit={salvarPermissaoEditada} className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Edição de permissão</p>
                            <h4 className="mt-1 text-lg font-black text-slate-950">{formulario.id ? "Editar pessoa com acesso ao app" : "Cadastrar login de acesso"}</h4>
                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                                Use Criar login do app para criar o usuário real no Supabase Auth com senha temporária. Use Salvar permissão quando precisar apenas ajustar perfil, bloqueio ou observação.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormAberto(false)}
                            className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                            Fechar edição
                        </button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Nome</span>
                            <input
                                value={formulario.nome}
                                onChange={(evento) => atualizarCampoFormulario("nome", evento.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                placeholder="Nome completo"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">E-mail</span>
                            <input
                                value={formulario.email}
                                onChange={(evento) => atualizarCampoFormulario("email", evento.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                placeholder="usuario@empresa.com"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Função</span>
                            <input
                                value={formulario.funcao}
                                onChange={(evento) => atualizarCampoFormulario("funcao", evento.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                placeholder="Função / área"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Perfil</span>
                            <select
                                value={formulario.perfil}
                                onChange={(evento) => atualizarCampoFormulario("perfil", evento.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            >
                                {PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.map((perfil) => (
                                    <option key={perfil.chave} value={perfil.chave}>{perfil.perfil}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Senha temporária</span>
                            <input
                                type="password"
                                value={formulario.senhaTemporaria}
                                onChange={(evento) => atualizarCampoFormulario("senhaTemporaria", evento.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                placeholder="Mínimo 6 caracteres"
                                autoComplete="new-password"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Confirmar senha temporária</span>
                            <input
                                type="password"
                                value={formulario.confirmarSenhaTemporaria}
                                onChange={(evento) => atualizarCampoFormulario("confirmarSenhaTemporaria", evento.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                placeholder="Repita a senha"
                                autoComplete="new-password"
                            />
                        </label>
                        <label className="flex items-start gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                            <input
                                type="checkbox"
                                checked={Boolean(formulario.resetarSenhaTemporaria)}
                                onChange={(evento) => atualizarCampoFormulario("resetarSenhaTemporaria", evento.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>
                                <span className="block text-xs font-black text-slate-700">Redefinir senha temporária</span>
                                <span className="mt-1 block text-[11px] font-semibold leading-5 text-slate-500">Use para login já existente. O usuário deverá trocar a senha no próximo acesso.</span>
                            </span>
                        </label>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <label className={`rounded-2xl bg-white p-4 ring-1 ${formulario.ativo ? "ring-emerald-100" : "ring-slate-200"}`}>
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={formulario.ativo}
                                    disabled={formulario.perfil === "bloqueado"}
                                    onChange={(evento) => atualizarCampoFormulario("ativo", evento.target.checked)}
                                    className="mt-1"
                                />
                                <div>
                                    <p className="text-xs font-black text-slate-950">Usuário ativo</p>
                                    <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">Quando ativo, o usuário pode acessar conforme o perfil e permissões liberadas.</p>
                                </div>
                            </div>
                        </label>
                        <label className={`rounded-2xl bg-white p-4 ring-1 ${formulario.bloqueado ? "ring-rose-100" : "ring-slate-200"}`}>
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={formulario.bloqueado}
                                    onChange={(evento) => atualizarCampoFormulario("bloqueado", evento.target.checked)}
                                    className="mt-1"
                                />
                                <div>
                                    <p className="text-xs font-black text-slate-950">Bloqueado</p>
                                    <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">Impede acesso operacional e mantém o cadastro para rastreabilidade.</p>
                                </div>
                            </div>
                        </label>
                        <label className={`rounded-2xl bg-white p-4 ring-1 ${formulario.acesso_global ? "ring-blue-100" : "ring-slate-200"}`}>
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    checked={formulario.acesso_global}
                                    disabled={formulario.perfil !== "administrador" || formulario.bloqueado}
                                    onChange={(evento) => atualizarCampoFormulario("acesso_global", evento.target.checked)}
                                    className="mt-1"
                                />
                                <div>
                                    <p className="text-xs font-black text-slate-950">Acesso global</p>
                                    <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">Somente Administrador pode ter acesso global. Bloqueado nunca recebe acesso global.</p>
                                </div>
                            </div>
                        </label>
                    </div>

                    <label className="mt-4 block">
                        <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Observação administrativa</span>
                        <textarea
                            value={formulario.observacao}
                            onChange={(evento) => atualizarCampoFormulario("observacao", evento.target.value)}
                            rows={2}
                            className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            placeholder="Exemplo: acesso liberado para auditoria, perfil criado por solicitação aprovada..."
                        />
                    </label>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={criarLoginDoApp}
                            disabled={criandoLogin || salvando}
                            className="rounded-2xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {criandoLogin ? "Criando login..." : "Criar login do app"}
                        </button>
                        <button
                            type="submit"
                            disabled={salvando || criandoLogin}
                            className="rounded-2xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {salvando ? "Salvando..." : "Salvar permissão"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormulario(montarFormularioUsuarioAcesso())}
                            disabled={salvando}
                            className="rounded-2xl bg-white px-5 py-2.5 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Limpar formulário
                        </button>
                    </div>
                </form>
            ) : null}

            <div className="mt-5 space-y-2">
                {usuarios.length > 0 ? usuarios.map((item) => (
                    <article key={item.id || item.email} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-950">{item.nome || "Usuário sem nome"}</p>
                                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.email || "email não informado"}</p>
                                <p className="mt-1 text-[11px] font-semibold text-slate-400">{item.funcao || "função não informada"}</p>
                            </div>
                            <div className="flex flex-wrap gap-2 xl:justify-end">
                                <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${obterClassePerfilAcessoApp(item.perfil)}`}>
                                    Perfil: {formatarPerfilAcessoApp(item.perfil)}
                                </span>
                                <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${obterClasseStatusAcessoApp(item)}`}>
                                    {formatarStatusAcessoApp(item)}
                                </span>
                                <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${item.acesso_global ? "bg-blue-50 text-blue-700 ring-blue-100" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>
                                    Acesso global: {item.acesso_global ? "Sim" : "Não"}
                                </span>
                                {item.precisa_trocar_senha ? (
                                    <span className="rounded-full bg-orange-50 px-3 py-1.5 text-[11px] font-black text-orange-800 ring-1 ring-orange-100">
                                        Trocar senha
                                    </span>
                                ) : null}
                                {emailEhUsuarioAtualAcessoApp(item.email, usuario) ? (
                                    <span className="rounded-full bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-800 ring-1 ring-amber-100">
                                        Usuário atual
                                    </span>
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => iniciarEdicao(item)}
                                    className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:bg-slate-800"
                                >
                                    Editar
                                </button>
                            </div>
                        </div>
                    </article>
                )) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                        Nenhum usuário carregado. Clique em Atualizar usuários para consultar a lista administrativa.
                    </div>
                )}
            </div>
        </Card>
    );
}

function RevisaoPerfisPadrao() {
    const [perfilAtivo, setPerfilAtivo] = useState(() => PERMISSOES_PADRAO_USUARIOS_POR_PERFIL[0]?.chave || "");
    const perfilSelecionado = PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.find((perfil) => perfil.chave === perfilAtivo) ||
        PERMISSOES_PADRAO_USUARIOS_POR_PERFIL[0] || null;

    return (
        <Card className="border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                        <ShieldCheck className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Revisão dos perfis padrão</p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">O que cada perfil pode fazer</h3>
                        <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                            Consulte a regra base antes de criar login, aprovar solicitações ou alterar perfis. A permissão real continua validada pelo Supabase/RPC.
                        </p>
                    </div>
                </div>
                <BadgeEtapa variante="sucesso">{PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.length} perfis padrão</BadgeEtapa>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
                {PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.map((perfil) => {
                    const ativo = perfilAtivo === perfil.chave;

                    return (
                        <button
                            key={perfil.chave}
                            type="button"
                            onClick={() => setPerfilAtivo(perfil.chave)}
                            className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-black ring-1 transition ${
                                ativo
                                    ? "bg-slate-950 text-white ring-slate-950 shadow-sm"
                                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            {perfil.perfil}
                        </button>
                    );
                })}
            </div>

            {perfilSelecionado ? (
                <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-blue-700">Perfil selecionado</p>
                            <h4 className="mt-1 text-2xl font-black text-slate-950">{perfilSelecionado.perfil}</h4>
                            <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-slate-500">{perfilSelecionado.nivel}</p>
                            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">{perfilSelecionado.resumo}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[330px]">
                            <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-xl font-black text-slate-950">{perfilSelecionado.modulosLiberados.length}</p>
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">módulos</p>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
                                <p className="text-xl font-black text-emerald-700">{perfilSelecionado.acoesLiberadas.length}</p>
                                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">liberadas</p>
                            </div>
                            <div className="rounded-2xl bg-red-50 px-3 py-3 ring-1 ring-red-100">
                                <p className="text-xl font-black text-red-700">{perfilSelecionado.acoesRestritas.length}</p>
                                <p className="text-[10px] font-black uppercase tracking-wide text-red-700">restritas</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 xl:grid-cols-3">
                        <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100 xl:col-span-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Pode acessar estes módulos</p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {perfilSelecionado.modulosLiberados.length > 0 ? perfilSelecionado.modulosLiberados.map((modulo) => (
                                    <span key={modulo} className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                                        {modulo}
                                    </span>
                                )) : (
                                    <span className="rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-black text-slate-400 ring-1 ring-slate-200">
                                        Nenhum módulo operacional liberado
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                                <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Pode fazer</p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {perfilSelecionado.acoesLiberadas.length > 0 ? perfilSelecionado.acoesLiberadas.map((acao) => (
                                    <span key={acao} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                                        {acao}
                                    </span>
                                )) : (
                                    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-400 ring-1 ring-slate-100">
                                        Nenhuma ação liberada
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-red-50 p-4 ring-1 ring-red-100">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-700" />
                                <p className="text-xs font-black uppercase tracking-wide text-red-700">Não deve fazer</p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {perfilSelecionado.acoesRestritas.length > 0 ? perfilSelecionado.acoesRestritas.map((acao) => (
                                    <span key={acao} className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-red-700 ring-1 ring-red-100">
                                        {acao}
                                    </span>
                                )) : (
                                    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-400 ring-1 ring-slate-100">
                                        Sem restrição padrão
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Observação de uso</p>
                            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">{perfilSelecionado.observacao}</p>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Comparativo rápido</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Use este resumo para validar se o perfil escolhido combina com a função do usuário.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                        {ACOES_USUARIOS_PERMISSOES_PLANEJADAS.length} ações avaliadas
                    </span>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.map((perfil) => (
                        <button
                            key={`resumo-${perfil.chave}`}
                            type="button"
                            onClick={() => setPerfilAtivo(perfil.chave)}
                            className={`rounded-2xl p-3 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-sm ${
                                perfilAtivo === perfil.chave
                                    ? "bg-blue-50 ring-blue-200"
                                    : "bg-white ring-slate-100 hover:ring-slate-200"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-black text-slate-950">{perfil.perfil}</p>
                                    <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-400">{perfil.nivel}</p>
                                </div>
                                <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
                                    Rever
                                </span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
                                <div className="rounded-xl bg-slate-50 px-2 py-2 ring-1 ring-slate-100">
                                    <p className="text-sm font-black text-slate-800">{perfil.modulosLiberados.length}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">módulos</p>
                                </div>
                                <div className="rounded-xl bg-emerald-50 px-2 py-2 ring-1 ring-emerald-100">
                                    <p className="text-sm font-black text-emerald-700">{perfil.acoesLiberadas.length}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">pode</p>
                                </div>
                                <div className="rounded-xl bg-red-50 px-2 py-2 ring-1 ring-red-100">
                                    <p className="text-sm font-black text-red-700">{perfil.acoesRestritas.length}</p>
                                    <p className="text-[9px] font-black uppercase tracking-wide text-red-700">não pode</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </Card>
    );
}

export function AcessosAppPage({ usuario = null }) {
    const [solicitacaoParaPermissao, setSolicitacaoParaPermissao] = useState(null);
    const nomeUsuario = obterNomeUsuario(usuario);
    const totalPerfis = PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.length;
    const totalPerfisPadrao = PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.length;

    return (
        <div className="page-shell space-y-5">
            <Card className="overflow-hidden border border-slate-200 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="grid gap-0 lg:grid-cols-[0.58fr_0.42fr]">
                    <section className="px-6 py-7 sm:px-8">
                        <div className="flex flex-wrap items-center gap-3">
                            <BadgeEtapa variante="sucesso">Nova aba administrativa</BadgeEtapa>
                            <BadgeEtapa>Roteiro 14 · Pacote 6</BadgeEtapa>
                        </div>
                        <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                            Acessos do App
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
                            Central para cadastrar pessoas, criar login real, revisar perfis, bloquear usuários e controlar permissões de acesso ao sistema SST.
                        </p>
                        <div className="mt-6 rounded-3xl border border-orange-100 bg-orange-50/70 p-4 text-sm font-bold leading-6 text-orange-800">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.2} />
                                <p>
                                    Esta etapa integra o cadastro de login real do app com senha temporária por Edge Function segura, sem expor credenciais administrativas no front-end.
                                </p>
                            </div>
                        </div>
                    </section>

                    <aside className="border-t border-slate-200 bg-slate-50/80 px-6 py-7 sm:px-8 lg:border-l lg:border-t-0">
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Resumo do acesso</p>
                        <div className="mt-4 space-y-3">
                            <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                                <p className="text-xs font-black text-slate-400">Usuário atual</p>
                                <p className="mt-1 text-base font-black text-slate-950">{nomeUsuario}</p>
                                <p className="mt-1 text-xs font-bold text-slate-500">{usuario?.email || "E-mail não informado"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-3xl bg-white p-4 text-center ring-1 ring-slate-200">
                                    <p className="text-2xl font-black text-slate-950">{totalPerfis}</p>
                                    <p className="mt-1 text-xs font-black text-slate-400">Perfis</p>
                                </div>
                                <div className="rounded-3xl bg-white p-4 text-center ring-1 ring-slate-200">
                                    <p className="text-2xl font-black text-slate-950">{totalPerfisPadrao}</p>
                                    <p className="mt-1 text-xs font-black text-slate-400">Perfis padrão</p>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </Card>

            <div className="grid gap-4 xl:grid-cols-5">
                {CARDS_ACESSOS_APP.map((item, indice) => (
                    <CardFuncionalidade key={item.titulo} item={item} indice={indice} />
                ))}
            </div>

            <UsuariosCadastradosApp
                usuario={usuario}
                usuarioParaEditar={solicitacaoParaPermissao}
                onEdicaoConsumida={() => setSolicitacaoParaPermissao(null)}
            />

            <SolicitacoesAcessoApp onPrepararPermissao={setSolicitacaoParaPermissao} />

            <RevisaoPerfisPadrao />

            <div className="grid gap-4 lg:grid-cols-[0.45fr_0.55fr]">
                <Card className="border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                            <KeyRound className="h-5 w-5" strokeWidth={2.2} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-950">Fluxo aprovado</h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                O administrador já pode criar o login com senha temporária pela Edge Function. No primeiro acesso, o usuário deverá trocar a senha antes de usar o sistema normalmente.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 space-y-3 text-sm font-bold text-slate-600">
                        {[
                            "Criar usuário no Supabase Auth somente por Edge Function.",
                            "Salvar perfil e permissões em usuarios_permissoes_sistema.",
                            "Nunca gravar senha temporária em tabela comum.",
                            "Registrar alterações na Auditoria do Sistema.",
                        ].map((item) => (
                            <div key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.4} />
                                <span>{item}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                            <UserCog className="h-5 w-5" strokeWidth={2.2} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-950">Separação da Configurações</h3>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                                A revisão completa dos perfis padrão, a lista de usuários cadastrados e as solicitações de acesso já ficam em Acessos do App. A criação de login real já foi integrada aqui. A próxima microetapa revisará a página de login e a troca obrigatória de senha.
                            </p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Fica em Configurações</p>
                            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
                                Storage, limites, token público, eventos, senha crítica, checklists e Supabase/RLS/RPC.
                            </p>
                        </div>
                        <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">Vem para Acessos</p>
                            <p className="mt-2 text-sm font-bold leading-6 text-emerald-700">
                                Usuários cadastrados, login, senha temporária, perfis, solicitações, bloqueios e permissões por módulo.
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}

export default AcessosAppPage;
