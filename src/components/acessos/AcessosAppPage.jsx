import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    RefreshCw,
    ShieldCheck,
    Trash2,
    UserPlus,
    UsersRound,
} from "lucide-react";
import { Card } from "../commonComponents";
import {
    ACOES_USUARIOS_PERMISSOES,
    ACOES_USUARIOS_PERMISSOES_PLANEJADAS,
    MODULOS_USUARIOS_PERMISSOES,
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
    excluirUsuarioPermissaoSistemaService,
    listarPerfisPermissoesSistemaService,
    restaurarPerfilPermissaoSistemaService,
    salvarPerfilPermissaoSistemaService,
} from "../../services/usuariosPermissoesSistemaService";

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

function obterChaveEmailSimilarAcessoApp(email = "") {
    return normalizarTextoAcesso(email)
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/\.br$/, "");
}

function usuarioTemLoginAuthAcessoApp(usuarioPermissao = {}) {
    return Boolean(usuarioPermissao?.user_id || usuarioPermissao?.login_criado_em);
}

const FORM_USUARIO_ACESSO_INICIAL = {
    id: null,
    nome: "",
    email: "",
    funcao: "",
    empresa: "",
    perfil: "consulta",
    ativo: true,
    bloqueado: false,
    acesso_global: false,
    observacao: "",
    excluido: false,
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
        empresa: usuario.empresa || "",
        perfil,
        ativo,
        bloqueado,
        acesso_global: perfil === "administrador" ? Boolean(usuario.acesso_global) : false,
        observacao: usuario.observacao || "",
        excluido: Boolean(usuario.excluido),
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
    const [historicoAberto, setHistoricoAberto] = useState(false);
    const [filtroStatus, setFiltroStatus] = useState("todos");
    const [busca, setBusca] = useState("");

    const resumo = useMemo(() => ({
        total: solicitacoes.length,
        pendentes: solicitacoes.filter((item) => item.status === "pendente").length,
        aprovadas: solicitacoes.filter((item) => item.status === "aprovada").length,
        concluidas: solicitacoes.filter((item) => item.status === "concluida").length,
        recusadas: solicitacoes.filter((item) => item.status === "recusada").length,
    }), [solicitacoes]);

    const solicitacoesFiltradas = useMemo(() => {
        const termo = normalizarTextoAcesso(busca).toLowerCase();

        return solicitacoes.filter((item) => {
            const statusItem = normalizarTextoAcesso(item.status || "pendente").toLowerCase();
            const textoItem = normalizarTextoAcesso([
                item.nome,
                item.email,
                item.area_solicitada,
                item.tela,
                item.perfil_atual,
                item.observacao,
                item.resposta_admin,
            ].filter(Boolean).join(" ")).toLowerCase();

            const passaStatus = filtroStatus === "todos" || statusItem === filtroStatus;
            const passaBusca = !termo || textoItem.includes(termo);

            return passaStatus && passaBusca;
        });
    }, [busca, filtroStatus, solicitacoes]);

    const filtroAplicado = filtroStatus !== "todos" || Boolean(busca.trim());

    async function carregarSolicitacoes() {
        if (carregando) return;

        setCarregando(true);
        setErro("");
        setMensagem("Consultando solicitações de acesso no Supabase...");

        try {
            const lista = await listarSolicitacoesAcessoSistemaService({ supabase });
            setSolicitacoes(lista);
            setMensagem(lista.length ? `${lista.length} ${lista.length === 1 ? "solicitação carregada" : "solicitações carregadas"}.` : "Nenhuma solicitação de acesso encontrada.");
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
                <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                        <ClipboardList className="h-5 w-5" strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Solicitações de acesso</p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">Pedidos feitos nas telas restritas</h3>
                        <p className="mt-2 max-w-none text-[13px] font-semibold leading-5 text-slate-500 xl:whitespace-nowrap">
                            Aprove, recuse ou conclua solicitações feitas em telas restritas. Solicitações aprovadas podem virar cadastro de login e permissão nesta mesma tela.
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-500">{mensagem}</p>
                        {erro ? <p className="mt-2 rounded-2xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 ring-1 ring-rose-100">{erro}</p> : null}
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                    <button
                        type="button"
                        onClick={() => setHistoricoAberto((valorAtual) => !valorAtual)}
                        className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        {historicoAberto ? "Recolher histórico" : "Mostrar histórico"}
                    </button>
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
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="flex h-[78px] flex-col items-center justify-center rounded-2xl bg-slate-50 px-4 py-3 text-center ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Total</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{resumo.total}</p>
                </div>
                <div className="flex h-[78px] flex-col items-center justify-center rounded-2xl bg-amber-50 px-4 py-3 text-center ring-1 ring-amber-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Pendentes</p>
                    <p className="mt-1 text-xl font-black text-amber-800">{resumo.pendentes}</p>
                </div>
                <div className="flex h-[78px] flex-col items-center justify-center rounded-2xl bg-emerald-50 px-4 py-3 text-center ring-1 ring-emerald-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Aprovadas</p>
                    <p className="mt-1 text-xl font-black text-emerald-800">{resumo.aprovadas}</p>
                </div>
                <div className="flex h-[78px] flex-col items-center justify-center rounded-2xl bg-blue-50 px-4 py-3 text-center ring-1 ring-blue-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">Concluídas</p>
                    <p className="mt-1 text-xl font-black text-blue-800">{resumo.concluidas}</p>
                </div>
                <div className="flex h-[78px] flex-col items-center justify-center rounded-2xl bg-rose-50 px-4 py-3 text-center ring-1 ring-rose-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">Recusadas</p>
                    <p className="mt-1 text-xl font-black text-rose-800">{resumo.recusadas}</p>
                </div>
            </div>

            {historicoAberto ? (
                <>
                    <div className="mt-5 grid gap-3 lg:grid-cols-[1.3fr_0.7fr_0.7fr]">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Buscar solicitação
                            </label>
                            <input
                                type="text"
                                value={busca}
                                onChange={(evento) => setBusca(evento.target.value)}
                                placeholder="Nome, e-mail, área, perfil ou observação"
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Status
                            </label>
                            <select
                                value={filtroStatus}
                                onChange={(evento) => setFiltroStatus(evento.target.value)}
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            >
                                <option value="todos">Todos os status</option>
                                <option value="pendente">Pendentes</option>
                                <option value="aprovada">Aprovadas</option>
                                <option value="concluida">Concluídas</option>
                                <option value="recusada">Recusadas</option>
                                <option value="cancelada">Canceladas</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setBusca("");
                                    setFiltroStatus("todos");
                                }}
                                className="w-full rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                Limpar filtros
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
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
                        {solicitacoesFiltradas.length > 0 ? solicitacoesFiltradas.map((item) => (
                            <article key={item.id || `${item.email}-${item.criado_em}`} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                                <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="truncate text-sm font-black text-slate-950">{item.nome || "Usuário sem nome"}</p>
                                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.email || "email não informado"}</p>
                                        <p className="mt-1 text-[11px] font-semibold text-slate-400">{formatarDataHoraAcessoApp(item.criado_em)}</p>
                                        {item.observacao ? <p className="mt-1 max-w-3xl text-xs font-semibold leading-relaxed text-slate-500">{item.observacao}</p> : null}
                                    </div>
                                    <div className="flex shrink-0 flex-wrap gap-2 xl:justify-end">
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
                                {filtroAplicado ? "Nenhuma solicitação encontrada para os filtros aplicados." : "Nenhuma solicitação carregada. Clique em Atualizar solicitações para consultar a lista administrativa."}
                            </div>
                        )}
                    </div>
                </>
            ) : null}
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
    const [filtroTexto, setFiltroTexto] = useState("");
    const [filtroPerfil, setFiltroPerfil] = useState("todos");
    const [filtroStatus, setFiltroStatus] = useState("todos");
    const [filtroEmpresa, setFiltroEmpresa] = useState("todos");
    const [listaUsuariosAberta, setListaUsuariosAberta] = useState(false);
    const [filtrosUsuariosAbertos, setFiltrosUsuariosAbertos] = useState(false);
    const [excluindoId, setExcluindoId] = useState("");

    const resumo = useMemo(() => ({
        total: usuarios.length,
        ativos: usuarios.filter((item) => item.ativo && !item.bloqueado).length,
        administradores: usuarios.filter((item) => item.perfil === "administrador").length,
        bloqueados: usuarios.filter((item) => item.bloqueado).length,
    }), [usuarios]);

    const emailsDuplicados = useMemo(() => {
        const mapa = new Map();

        usuarios.forEach((item) => {
            const email = normalizarTextoAcesso(item.email).toLowerCase();
            if (!email) return;
            mapa.set(email, [...(mapa.get(email) || []), item]);
        });

        return Array.from(mapa.entries()).filter(([, lista]) => lista.length > 1);
    }, [usuarios]);

    const emailsParecidos = useMemo(() => {
        const mapa = new Map();

        usuarios.forEach((item) => {
            const email = normalizarTextoAcesso(item.email).toLowerCase();
            const chave = obterChaveEmailSimilarAcessoApp(email);
            if (!email || !chave) return;
            mapa.set(chave, [...(mapa.get(chave) || []), email]);
        });

        return Array.from(mapa.entries())
            .map(([chave, emails]) => [chave, Array.from(new Set(emails))])
            .filter(([, emails]) => emails.length > 1);
    }, [usuarios]);



    const empresasDisponiveis = useMemo(() => {
        return Array.from(new Set(
            usuarios
                .map((item) => normalizarTextoAcesso(item.empresa))
                .filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, "pt-BR"));
    }, [usuarios]);

    const usuariosFiltrados = useMemo(() => {
        const busca = normalizarTextoAcesso(filtroTexto).toLowerCase();

        return usuarios.filter((item) => {
            const textoBase = [item.nome, item.email, item.funcao, item.empresa, item.perfil]
                .map((valor) => normalizarTextoAcesso(valor).toLowerCase())
                .join(" ");

            const status = item.bloqueado ? "bloqueado" : item.ativo ? "ativo" : "inativo";
            const loginAuth = usuarioTemLoginAuthAcessoApp(item) ? "com_login" : "sem_login";

            const passaTexto = !busca || textoBase.includes(busca);
            const passaPerfil = filtroPerfil === "todos" || normalizarTextoAcesso(item.perfil).toLowerCase() === filtroPerfil;
            const passaEmpresa = filtroEmpresa === "todos" || normalizarTextoAcesso(item.empresa) === filtroEmpresa;
            const passaStatus = filtroStatus === "todos" || status === filtroStatus || loginAuth === filtroStatus;

            return passaTexto && passaPerfil && passaEmpresa && passaStatus;
        });
    }, [usuarios, filtroTexto, filtroPerfil, filtroStatus, filtroEmpresa]);

    const filtrosAtivos = Boolean(filtroTexto || filtroPerfil !== "todos" || filtroStatus !== "todos" || filtroEmpresa !== "todos");

    function limparFiltrosUsuarios() {
        setFiltroTexto("");
        setFiltroPerfil("todos");
        setFiltroStatus("todos");
        setFiltroEmpresa("todos");
    }

    function alternarListaUsuarios() {
        setListaUsuariosAberta((valorAtual) => {
            const proximoValor = !valorAtual;
            setFiltrosUsuariosAbertos(proximoValor);
            return proximoValor;
        });
    }

    async function carregarUsuarios() {
        if (carregando) return;

        setCarregando(true);
        setErro("");
        setMensagem("Consultando usuários e permissões no Supabase...");

        try {
            const lista = await listarUsuariosPermissoesSistemaService({ supabase });
            setUsuarios(lista);
            setMensagem(lista.length ? `${lista.length} pessoa(s) carregada(s). A lista principal mostra apenas acessos ativos por padrão.` : "Nenhum usuário cadastrado encontrado.");
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
                    // Criar login do app sempre usa a senha informada como senha temporária.
                    // Se o e-mail já existir no Supabase Auth, a senha será redefinida e a troca obrigatória será marcada.
                    resetarSenhaTemporaria: true,
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
                    empresa: permissaoSalva?.empresa || formulario.empresa,
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
                    resetarSenhaTemporaria: true,
                });
            }

            setMensagem(resultado?.mensagem || "Login criado/atualizado com sucesso. O perfil editável foi aplicado e o usuário deve trocar a senha temporária no primeiro acesso.");
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

            setMensagem("Permissão salva com o padrão editável do perfil selecionado. Para criar ou redefinir login real, use o botão Criar login do app com senha temporária.");
        } catch (error) {
            setErro(error?.message || "Não foi possível salvar a permissão do usuário.");
            setMensagem("A permissão não foi salva.");
        } finally {
            setSalvando(false);
        }
    }



    async function excluirAcessoUsuario(item) {
        if (!item?.email || excluindoId) return;

        if (emailEhUsuarioAtualAcessoApp(item.email, usuario)) {
            setErro("Você não pode excluir o próprio acesso. Use outro administrador para essa ação.");
            return;
        }

        const confirmar = window.confirm(
            `Excluir definitivamente o acesso de ${item.email}? A ação remove o cadastro de acesso da lista do app. Colaboradores, empresas e documentos não serão apagados.`
        );

        if (!confirmar) return;

        const idProcesso = item.id || item.email;
        setExcluindoId(idProcesso);
        setErro("");
        setMensagem(`Excluindo acesso de ${item.email}...`);

        try {
            const excluido = await excluirUsuarioPermissaoSistemaService({
                supabase,
                usuario: item,
                usuarioAtual: usuario,
                observacao: "Acesso removido definitivamente pela aba Acessos do App.",
            });

            const emailRemovido = normalizarTextoAcesso(excluido?.email || item.email).toLowerCase();
            const idRemovido = excluido?.id || item.id;

            setUsuarios((listaAtual) => listaAtual.filter((usuarioLista) => {
                const mesmoId = idRemovido && usuarioLista.id === idRemovido;
                const mesmoEmail = emailRemovido && normalizarTextoAcesso(usuarioLista.email).toLowerCase() === emailRemovido;
                return !(mesmoId || mesmoEmail);
            }));
            setMensagem("Acesso excluído definitivamente da lista do app. Colaboradores, empresas e documentos não foram apagados.");
        } catch (error) {
            setErro(error?.message || "Não foi possível excluir o acesso.");
            setMensagem("O acesso não foi excluído.");
        } finally {
            setExcluindoId("");
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
            empresa: usuarioParaEditar.empresa || "",
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
                        onClick={alternarListaUsuarios}
                        className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        {listaUsuariosAberta ? "Recolher lista" : "Abrir lista e filtros"}
                    </button>
                    <button
                        type="button"
                        onClick={abrirCadastroVazio}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm ring-1 ring-slate-950 hover:bg-slate-800"
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        Cadastrar login
                    </button>
                    <button
                        type="button"
                        onClick={carregarUsuarios}
                        disabled={carregando}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} />
                        {carregando ? "Carregando" : "Atualizar usuários"}
                    </button>
                </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex h-[78px] flex-col items-center justify-center rounded-2xl bg-slate-50 px-4 py-3 text-center ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Total</p>
                    <p className="mt-1 text-xl font-black text-slate-950">{resumo.total}</p>
                </div>
                <div className="flex h-[78px] flex-col items-center justify-center rounded-2xl bg-emerald-50 px-4 py-3 text-center ring-1 ring-emerald-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Ativos</p>
                    <p className="mt-1 text-xl font-black text-emerald-800">{resumo.ativos}</p>
                </div>
                <div className="flex h-[78px] flex-col items-center justify-center rounded-2xl bg-blue-50 px-4 py-3 text-center ring-1 ring-blue-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">Administradores</p>
                    <p className="mt-1 text-xl font-black text-blue-800">{resumo.administradores}</p>
                </div>
                <div className="flex h-[78px] flex-col items-center justify-center rounded-2xl bg-rose-50 px-4 py-3 text-center ring-1 ring-rose-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">Bloqueados</p>
                    <p className="mt-1 text-xl font-black text-rose-800">{resumo.bloqueados}</p>
                </div>
            </div>

            {listaUsuariosAberta && !filtrosUsuariosAbertos && filtrosAtivos ? (
                <div className="mt-5 flex flex-col gap-3 rounded-3xl bg-blue-50 px-4 py-3 ring-1 ring-blue-100 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs font-bold text-blue-800">
                        Filtros aplicados. Mostrando {usuariosFiltrados.length} de {usuarios.length} pessoa(s).
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setFiltrosUsuariosAbertos(true)}
                            className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100"
                        >
                            Abrir filtros
                        </button>
                        <button
                            type="button"
                            onClick={limparFiltrosUsuarios}
                            className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                            Limpar filtros
                        </button>
                    </div>
                </div>
            ) : null}

            {listaUsuariosAberta && filtrosUsuariosAbertos ? (
                <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Buscar usuário</span>
                            <input
                                value={filtroTexto}
                                onChange={(evento) => setFiltroTexto(evento.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                placeholder="Nome, e-mail, empresa, função ou perfil"
                            />
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Perfil</span>
                            <select
                                value={filtroPerfil}
                                onChange={(evento) => setFiltroPerfil(evento.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            >
                                <option value="todos">Todos os perfis</option>
                                {PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.map((perfil) => (
                                    <option key={perfil.chave} value={perfil.chave}>{perfil.perfil}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Empresa</span>
                            <select
                                value={filtroEmpresa}
                                onChange={(evento) => setFiltroEmpresa(evento.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            >
                                <option value="todos">Todas as empresas</option>
                                {empresasDisponiveis.map((empresa) => (
                                    <option key={empresa} value={empresa}>{empresa}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Status</span>
                            <select
                                value={filtroStatus}
                                onChange={(evento) => setFiltroStatus(evento.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            >
                                <option value="todos">Todos os status</option>
                                <option value="ativo">Ativos</option>
                                <option value="bloqueado">Bloqueados</option>
                                <option value="inativo">Inativos</option>
                                <option value="com_login">Com login Auth</option>
                                <option value="sem_login">Sem vínculo Auth</option>
                            </select>
                        </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <span className="rounded-full bg-white px-3 py-2 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                            Mostrando {usuariosFiltrados.length} de {usuarios.length}
                        </span>
                        {filtrosAtivos ? (
                            <button
                                type="button"
                                onClick={limparFiltrosUsuarios}
                                className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                            >
                                Limpar filtros
                            </button>
                        ) : null}
                    </div>
                </div>
                {(emailsDuplicados.length > 0 || emailsParecidos.length > 0) ? (
                    <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800 ring-1 ring-amber-100">
                        Conferência recomendada: {emailsDuplicados.length ? `${emailsDuplicados.length} e-mail(s) duplicado(s). ` : "Nenhum e-mail duplicado encontrado. "}{emailsParecidos.length ? `Há ${emailsParecidos.length} grupo(s) de e-mails parecidos para conferência.` : "Não há e-mails parecidos."}
                    </div>
                ) : null}
                </div>
            ) : null}

            {listaUsuariosAberta && !filtrosUsuariosAbertos && (emailsDuplicados.length > 0 || emailsParecidos.length > 0) ? (
                <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800 ring-1 ring-amber-100">
                    Conferência recomendada: {emailsDuplicados.length ? `${emailsDuplicados.length} e-mail(s) duplicado(s). ` : "Nenhum e-mail duplicado encontrado. "}{emailsParecidos.length ? `Há ${emailsParecidos.length} grupo(s) de e-mails parecidos para conferência.` : "Não há e-mails parecidos."}
                </div>
            ) : null}

            {formAberto ? (
                <form onSubmit={salvarPermissaoEditada} className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Edição de permissão</p>
                            <h4 className="mt-1 text-lg font-black text-slate-950">{formulario.id ? "Editar pessoa com acesso ao app" : "Cadastrar login de acesso"}</h4>
                            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                                Use Criar login do app para criar o usuário real no Supabase Auth. Ao escolher um perfil, o padrão editável salvo em Perfis padrão será aplicado às permissões do usuário.
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

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
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
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Empresa</span>
                            <input
                                value={formulario.empresa}
                                onChange={(evento) => atualizarCampoFormulario("empresa", evento.target.value)}
                                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                placeholder="Empresa / contrato"
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
                            <p className="mt-2 rounded-2xl bg-blue-50 px-3 py-2 text-[11px] font-bold leading-5 text-blue-700 ring-1 ring-blue-100">
                                Ao salvar, o sistema aplica automaticamente o padrão editável deste perfil nas permissões do usuário.
                            </p>
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

            {listaUsuariosAberta ? (
                <div className="mt-5 space-y-2">
                {usuariosFiltrados.length > 0 ? usuariosFiltrados.map((item) => (
                    <article key={item.id || item.email} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                        <div className="grid w-full gap-3 xl:grid-cols-[minmax(230px,1fr)_minmax(0,auto)] xl:items-center">
                            <div className="min-w-0 text-left">
                                <p className="truncate text-sm font-black text-slate-950">{item.nome || "Usuário sem nome"}</p>
                                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.email || "email não informado"}</p>
                                <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{item.empresa || "empresa não informada"}</p>
                                <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{item.funcao || "função não informada"}</p>
                            </div>
                            <div className="flex min-w-0 flex-col gap-2 xl:items-end">
                                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                                    <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${obterClassePerfilAcessoApp(item.perfil)}`}>
                                        Perfil: {formatarPerfilAcessoApp(item.perfil)}
                                    </span>
                                    <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${obterClasseStatusAcessoApp(item)}`}>
                                        {formatarStatusAcessoApp(item)}
                                    </span>
                                    <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${item.acesso_global ? "bg-blue-50 text-blue-700 ring-blue-100" : "bg-slate-100 text-slate-500 ring-slate-200"}`}>
                                        Acesso global: {item.acesso_global ? "Sim" : "Não"}
                                    </span>
                                    <span className={`rounded-full px-3 py-1.5 text-[11px] font-black ring-1 ${usuarioTemLoginAuthAcessoApp(item) ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-800 ring-amber-100"}`}>
                                        Login Auth: {usuarioTemLoginAuthAcessoApp(item) ? "Vinculado" : "Pendente"}
                                    </span>
                                    {item.ultimo_login_em ? (
                                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
                                            Último login: {formatarDataHoraAcessoApp(item.ultimo_login_em)}
                                        </span>
                                    ) : null}
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
                                </div>
                                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => iniciarEdicao(item)}
                                        className="rounded-full bg-slate-950 px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:bg-slate-800"
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => excluirAcessoUsuario(item)}
                                        disabled={emailEhUsuarioAtualAcessoApp(item.email, usuario) || excluindoId === (item.id || item.email)}
                                        className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 ring-1 ring-rose-100 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        {excluindoId === (item.id || item.email) ? "Excluindo" : "Excluir acesso"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </article>
                )) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-4 text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                        Nenhum usuário encontrado para os filtros selecionados. Ajuste os filtros ou clique em Atualizar usuários.
                    </div>
                )}
                </div>
            ) : null}
        </Card>
    );
}

function montarPermissoesJsonPerfilAcesso({ modulosLiberados = [], acoesLiberadas = [], chavePerfil = "" } = {}) {
    const modulosSelecionados = new Set(modulosLiberados);
    const acoesSelecionadas = new Set(acoesLiberadas);
    const todosModulosSelecionados = MODULOS_USUARIOS_PERMISSOES.every((modulo) => modulosSelecionados.has(modulo.modulo));
    const todasAcoesSelecionadas = ACOES_USUARIOS_PERMISSOES.every((acao) => acoesSelecionadas.has(acao.acao));
    const modulos = {};

    MODULOS_USUARIOS_PERMISSOES.forEach((modulo) => {
        if (!modulosSelecionados.has(modulo.modulo)) return;

        modulos[modulo.chave] = {};
        ACOES_USUARIOS_PERMISSOES.forEach((acao) => {
            if (acoesSelecionadas.has(acao.acao)) {
                modulos[modulo.chave][acao.chave] = true;
            }
        });
    });

    return {
        acessoTotal: chavePerfil === "administrador" && todosModulosSelecionados && todasAcoesSelecionadas,
        modulos,
        acoesCriticas: {
            excluir: acoesSelecionadas.has("Excluir"),
            limpar_arquivos: acoesSelecionadas.has("Limpar arquivos"),
            gerenciar_permissoes: acoesSelecionadas.has("Gerenciar permissões"),
            configuracoes_criticas: acoesSelecionadas.has("Gerenciar permissões") && modulosSelecionados.has("Configurações"),
        },
    };
}

function normalizarPerfilEditavelParaTela(perfil = null) {
    if (!perfil) return null;

    const fallback = PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.find((item) => item.chave === perfil.chave) || {};
    const modulosLiberados = Array.isArray(perfil.modulosLiberados) ? perfil.modulosLiberados : fallback.modulosLiberados || [];
    const acoesLiberadas = Array.isArray(perfil.acoesLiberadas) ? perfil.acoesLiberadas : fallback.acoesLiberadas || [];
    const acoesRestritas = Array.isArray(perfil.acoesRestritas) && perfil.acoesRestritas.length > 0
        ? perfil.acoesRestritas
        : ACOES_USUARIOS_PERMISSOES_PLANEJADAS.filter((acao) => !acoesLiberadas.includes(acao));

    return {
        ...fallback,
        ...perfil,
        chave: perfil.chave || fallback.chave,
        perfil: perfil.perfil || perfil.nome || fallback.perfil,
        nome: perfil.nome || perfil.perfil || fallback.perfil,
        descricao: perfil.descricao || fallback.descricao || "",
        nivel: perfil.nivel || fallback.nivel || "",
        resumo: perfil.resumo || fallback.resumo || "",
        modulosLiberados,
        acoesLiberadas,
        acoesRestritas,
        observacao: perfil.observacao || fallback.observacao || "",
        permissoesJson: perfil.permissoesJson || fallback.permissoesJson || {},
        ativo: perfil.ativo !== false,
        editavel: perfil.editavel !== false,
    };
}

function montarFormularioPerfilAcesso(perfil = null) {
    const perfilNormalizado = normalizarPerfilEditavelParaTela(perfil) || normalizarPerfilEditavelParaTela(PERMISSOES_PADRAO_USUARIOS_POR_PERFIL[0]);

    return {
        chave: perfilNormalizado?.chave || "consulta",
        nome: perfilNormalizado?.nome || perfilNormalizado?.perfil || "Consulta",
        descricao: perfilNormalizado?.descricao || "",
        nivel: perfilNormalizado?.nivel || "",
        resumo: perfilNormalizado?.resumo || "",
        modulosLiberados: [...(perfilNormalizado?.modulosLiberados || [])],
        acoesLiberadas: [...(perfilNormalizado?.acoesLiberadas || [])],
        observacao: perfilNormalizado?.observacao || "",
        ativo: perfilNormalizado?.ativo !== false,
        editavel: perfilNormalizado?.editavel !== false,
    };
}

function alternarItemListaAcesso(lista = [], item = "") {
    const valor = normalizarTextoAcesso(item);
    if (!valor) return lista;

    return lista.includes(valor) ? lista.filter((entrada) => entrada !== valor) : [...lista, valor];
}

function RevisaoPerfisPadrao() {
    const perfisFallback = useMemo(
        () => PERMISSOES_PADRAO_USUARIOS_POR_PERFIL.map((perfil) => normalizarPerfilEditavelParaTela(perfil)).filter(Boolean),
        []
    );
    const [perfis, setPerfis] = useState(perfisFallback);
    const [perfilAtivo, setPerfilAtivo] = useState(() => perfisFallback[0]?.chave || "");
    const [formularioPerfil, setFormularioPerfil] = useState(() => montarFormularioPerfilAcesso(perfisFallback[0]));
    const [modoEdicao, setModoEdicao] = useState(false);
    const [carregandoPerfis, setCarregandoPerfis] = useState(false);
    const [salvandoPerfil, setSalvandoPerfil] = useState(false);
    const [mensagemPerfil, setMensagemPerfil] = useState("");
    const [erroPerfil, setErroPerfil] = useState("");
    const [perfisAberto, setPerfisAberto] = useState(false);

    const perfilSelecionado = useMemo(
        () => perfis.find((perfil) => perfil.chave === perfilAtivo) || perfis[0] || null,
        [perfilAtivo, perfis]
    );

    useEffect(() => {
        let ativo = true;

        async function carregarPerfisEditaveis() {
            setCarregandoPerfis(true);
            setErroPerfil("");

            try {
                const lista = await listarPerfisPermissoesSistemaService({ supabase });
                if (!ativo) return;

                const listaNormalizada = lista.map((perfil) => normalizarPerfilEditavelParaTela(perfil)).filter(Boolean);

                if (listaNormalizada.length > 0) {
                    setPerfis(listaNormalizada);
                    setPerfilAtivo((atual) => listaNormalizada.some((perfil) => perfil.chave === atual) ? atual : listaNormalizada[0].chave);
                }
            } catch (error) {
                if (ativo) {
                    setErroPerfil(error?.message || "Não foi possível carregar os perfis editáveis. Usando padrão local como referência.");
                }
            } finally {
                if (ativo) setCarregandoPerfis(false);
            }
        }

        carregarPerfisEditaveis();

        return () => {
            ativo = false;
        };
    }, []);

    useEffect(() => {
        if (!modoEdicao && perfilSelecionado) {
            setFormularioPerfil(montarFormularioPerfilAcesso(perfilSelecionado));
        }
    }, [modoEdicao, perfilSelecionado]);

    function selecionarPerfil(chave) {
        setPerfilAtivo(chave);
        setModoEdicao(false);
        setMensagemPerfil("");
        setErroPerfil("");
    }

    function atualizarCampoPerfil(campo, valor) {
        setFormularioPerfil((atual) => ({
            ...atual,
            [campo]: valor,
        }));
    }

    function alternarModuloPerfil(modulo) {
        setFormularioPerfil((atual) => ({
            ...atual,
            modulosLiberados: alternarItemListaAcesso(atual.modulosLiberados, modulo),
        }));
    }

    function alternarAcaoPerfil(acao) {
        setFormularioPerfil((atual) => ({
            ...atual,
            acoesLiberadas: alternarItemListaAcesso(atual.acoesLiberadas, acao),
        }));
    }

    async function salvarPerfil() {
        setSalvandoPerfil(true);
        setErroPerfil("");
        setMensagemPerfil("");

        try {
            const acoesRestritas = ACOES_USUARIOS_PERMISSOES_PLANEJADAS.filter((acao) => !formularioPerfil.acoesLiberadas.includes(acao));
            const permissoesJson = montarPermissoesJsonPerfilAcesso({
                modulosLiberados: formularioPerfil.modulosLiberados,
                acoesLiberadas: formularioPerfil.acoesLiberadas,
                chavePerfil: formularioPerfil.chave,
            });
            const perfilSalvo = await salvarPerfilPermissaoSistemaService({
                supabase,
                perfil: {
                    ...formularioPerfil,
                    acoesRestritas,
                    permissoesJson,
                },
            });
            const perfilTela = normalizarPerfilEditavelParaTela(perfilSalvo);

            setPerfis((atuais) => atuais.map((perfil) => perfil.chave === perfilTela.chave ? perfilTela : perfil));
            setPerfilAtivo(perfilTela.chave);
            setModoEdicao(false);
            setMensagemPerfil("Perfil padrão salvo. Novos usuários poderão usar esta regra como referência nas próximas etapas.");
        } catch (error) {
            setErroPerfil(error?.message || "Não foi possível salvar o perfil padrão.");
        } finally {
            setSalvandoPerfil(false);
        }
    }

    async function restaurarPerfil() {
        if (!perfilSelecionado?.chave) return;

        const confirmar = window.confirm(`Restaurar o padrão original do perfil ${perfilSelecionado.perfil || perfilSelecionado.nome}?`);
        if (!confirmar) return;

        setSalvandoPerfil(true);
        setErroPerfil("");
        setMensagemPerfil("");

        try {
            const perfilRestaurado = await restaurarPerfilPermissaoSistemaService({ supabase, chave: perfilSelecionado.chave });
            const perfilTela = normalizarPerfilEditavelParaTela(perfilRestaurado);

            setPerfis((atuais) => atuais.map((perfil) => perfil.chave === perfilTela.chave ? perfilTela : perfil));
            setFormularioPerfil(montarFormularioPerfilAcesso(perfilTela));
            setModoEdicao(false);
            setMensagemPerfil("Perfil restaurado para o padrão original do sistema.");
        } catch (error) {
            setErroPerfil(error?.message || "Não foi possível restaurar o perfil padrão.");
        } finally {
            setSalvandoPerfil(false);
        }
    }

    const perfilParaExibir = modoEdicao ? {
        ...formularioPerfil,
        perfil: formularioPerfil.nome,
        acoesRestritas: ACOES_USUARIOS_PERMISSOES_PLANEJADAS.filter((acao) => !formularioPerfil.acoesLiberadas.includes(acao)),
    } : perfilSelecionado;

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
                            Edite a regra base de cada perfil. Esta etapa grava o padrão no Supabase; aplicar automaticamente aos usuários existentes será feito em etapa separada.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <BadgeEtapa variante="sucesso">{perfis.length} perfis editáveis</BadgeEtapa>
                    <button
                        type="button"
                        onClick={() => {
                            setPerfisAberto((atual) => {
                                if (atual) setModoEdicao(false);
                                return !atual;
                            });
                        }}
                        className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        {perfisAberto ? "Recolher perfis" : "Abrir perfis"}
                    </button>
                    {perfisAberto ? (
                        <button
                            type="button"
                            onClick={() => setModoEdicao((atual) => !atual)}
                            disabled={!perfilSelecionado || carregandoPerfis || salvandoPerfil}
                            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {modoEdicao ? "Cancelar edição" : "Editar perfil"}
                        </button>
                    ) : null}
                </div>
            </div>

            {erroPerfil ? (
                <div className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 ring-1 ring-rose-100">
                    {erroPerfil}
                </div>
            ) : null}
            {mensagemPerfil ? (
                <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                    {mensagemPerfil}
                </div>
            ) : null}

            {perfisAberto ? (
                <>
            <div className="mt-5 flex flex-wrap gap-2">
                {perfis.map((perfil) => {
                    const ativo = perfilAtivo === perfil.chave;

                    return (
                        <button
                            key={perfil.chave}
                            type="button"
                            onClick={() => selecionarPerfil(perfil.chave)}
                            className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-black ring-1 transition ${
                                ativo
                                    ? "bg-slate-950 text-white ring-slate-950 shadow-sm"
                                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            {perfil.perfil || perfil.nome}
                        </button>
                    );
                })}
            </div>

            {perfilParaExibir ? (
                <div className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black uppercase tracking-wide text-blue-700">Perfil selecionado</p>
                            {modoEdicao ? (
                                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                    <label className="block">
                                        <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Nome do perfil</span>
                                        <input
                                            value={formularioPerfil.nome}
                                            onChange={(evento) => atualizarCampoPerfil("nome", evento.target.value)}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Nível</span>
                                        <input
                                            value={formularioPerfil.nivel}
                                            onChange={(evento) => atualizarCampoPerfil("nivel", evento.target.value)}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                                        />
                                    </label>
                                    <label className="block lg:col-span-2">
                                        <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Resumo</span>
                                        <textarea
                                            value={formularioPerfil.resumo}
                                            onChange={(evento) => atualizarCampoPerfil("resumo", evento.target.value)}
                                            rows={2}
                                            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                                        />
                                    </label>
                                </div>
                            ) : (
                                <>
                                    <h4 className="mt-1 text-2xl font-black text-slate-950">{perfilParaExibir.perfil || perfilParaExibir.nome}</h4>
                                    <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-slate-500">{perfilParaExibir.nivel}</p>
                                    <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">{perfilParaExibir.resumo}</p>
                                </>
                            )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[330px]">
                            <div className="rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-100">
                                <p className="text-xl font-black text-slate-950">{perfilParaExibir.modulosLiberados.length}</p>
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">módulos</p>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 px-3 py-3 ring-1 ring-emerald-100">
                                <p className="text-xl font-black text-emerald-700">{perfilParaExibir.acoesLiberadas.length}</p>
                                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">liberadas</p>
                            </div>
                            <div className="rounded-2xl bg-red-50 px-3 py-3 ring-1 ring-red-100">
                                <p className="text-xl font-black text-red-700">{perfilParaExibir.acoesRestritas.length}</p>
                                <p className="text-[10px] font-black uppercase tracking-wide text-red-700">restritas</p>
                            </div>
                        </div>
                    </div>

                    {modoEdicao ? (
                        <div className="mt-5 grid gap-4 xl:grid-cols-[0.58fr_0.42fr]">
                            <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Módulos liberados</p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {MODULOS_USUARIOS_PERMISSOES.map((modulo) => {
                                        const marcado = formularioPerfil.modulosLiberados.includes(modulo.modulo);
                                        return (
                                            <label key={modulo.chave} className={`flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black ring-1 ${marcado ? "bg-blue-50 text-blue-700 ring-blue-100" : "bg-white text-slate-500 ring-slate-200"}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={marcado}
                                                    onChange={() => alternarModuloPerfil(modulo.modulo)}
                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                {modulo.modulo}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Ações permitidas</p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {ACOES_USUARIOS_PERMISSOES.map((acao) => {
                                        const marcado = formularioPerfil.acoesLiberadas.includes(acao.acao);
                                        return (
                                            <label key={acao.chave} className={`flex cursor-pointer items-center gap-2 rounded-2xl px-3 py-2 text-xs font-black ring-1 ${marcado ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-white text-slate-500 ring-slate-200"}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={marcado}
                                                    onChange={() => alternarAcaoPerfil(acao.acao)}
                                                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                />
                                                {acao.acao}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <label className="block xl:col-span-2">
                                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Observação de uso</span>
                                <textarea
                                    value={formularioPerfil.observacao}
                                    onChange={(evento) => atualizarCampoPerfil("observacao", evento.target.value)}
                                    rows={3}
                                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
                                />
                            </label>
                            <div className="flex flex-wrap gap-2 xl:col-span-2">
                                <button
                                    type="button"
                                    onClick={salvarPerfil}
                                    disabled={salvandoPerfil}
                                    className="rounded-full bg-slate-950 px-5 py-3 text-xs font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {salvandoPerfil ? "Salvando perfil" : "Salvar perfil padrão"}
                                </button>
                                <button
                                    type="button"
                                    onClick={restaurarPerfil}
                                    disabled={salvandoPerfil}
                                    className="rounded-full bg-white px-5 py-3 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Restaurar padrão original
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-5 grid gap-3 xl:grid-cols-3">
                            <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-100 xl:col-span-3">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">Pode acessar estes módulos</p>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {perfilParaExibir.modulosLiberados.length > 0 ? perfilParaExibir.modulosLiberados.map((modulo) => (
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
                                    {perfilParaExibir.acoesLiberadas.length > 0 ? perfilParaExibir.acoesLiberadas.map((acao) => (
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
                                    {perfilParaExibir.acoesRestritas.length > 0 ? perfilParaExibir.acoesRestritas.map((acao) => (
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
                                <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-600">{perfilParaExibir.observacao}</p>
                            </div>
                        </div>
                    )}
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
                    {perfis.map((perfil) => (
                        <button
                            key={`resumo-${perfil.chave}`}
                            type="button"
                            onClick={() => selecionarPerfil(perfil.chave)}
                            className={`rounded-2xl p-3 text-left ring-1 transition hover:-translate-y-0.5 hover:shadow-sm ${
                                perfilAtivo === perfil.chave
                                    ? "bg-blue-50 ring-blue-200"
                                    : "bg-white ring-slate-100 hover:ring-slate-200"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-black text-slate-950">{perfil.perfil || perfil.nome}</p>
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
                </>
            ) : null}
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
                            <BadgeEtapa variante="sucesso">Área administrativa</BadgeEtapa>
                            <BadgeEtapa>Login e permissões</BadgeEtapa>
                        </div>
                        <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                            Acessos do App
                        </h2>
                        <p className="mt-3 max-w-3xl text-sm font-semibold leading-7 text-slate-500">
                            Central para cadastrar pessoas, criar login real, revisar perfis, bloquear usuários e controlar permissões de acesso ao sistema SST.
                        </p>
                        <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm font-bold leading-6 text-emerald-800">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.2} />
                                <p>
                                    Login real, senha temporária, troca obrigatória de senha e permissões por perfil estão centralizados nesta área.
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

            <UsuariosCadastradosApp
                usuario={usuario}
                usuarioParaEditar={solicitacaoParaPermissao}
                onEdicaoConsumida={() => setSolicitacaoParaPermissao(null)}
            />

            <SolicitacoesAcessoApp onPrepararPermissao={setSolicitacaoParaPermissao} />

            <RevisaoPerfisPadrao />

        </div>
    );
}

export default AcessosAppPage;
