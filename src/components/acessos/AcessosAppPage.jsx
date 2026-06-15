import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
    Camera,
    CheckCircle2,
    ClipboardList,
    ImagePlus,
    Info,
    LockKeyhole,
    RefreshCw,
    ShieldCheck,
    Trash2,
    UserPlus,
    UsersRound,
    X,
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
import { registrarAuditoriaSistemaService } from "../../services/auditoriaSistemaCrudService";
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
    aplicarPerfilPermissaoUsuariosSistemaService,
} from "../../services/usuariosPermissoesSistemaService";

const BUCKET_FOTOS_USUARIOS_ACESSO_APP = "fotos-colaboradores";
const FOTO_ACESSO_URL_CACHE = new Map();
const FOTO_ACESSO_PROMISE_CACHE = new Map();

function obterNomeUsuario(usuario) {
    const nome = String(usuario?.nome || usuario?.user_metadata?.nome || "").trim();
    const email = String(usuario?.email || "").trim();

    if (nome) return nome;
    if (email.includes("@")) return email.split("@")[0];
    return "Administrador";
}

function obterFotoUsuarioAcessoApp(usuario) {
    const metadados = usuario?.user_metadata || {};
    const candidatos = [
        usuario?.foto_url,
        usuario?.fotoUrl,
        usuario?.avatar_url,
        usuario?.avatarUrl,
        usuario?.picture,
        metadados?.foto_url,
        metadados?.fotoUrl,
        metadados?.avatar_url,
        metadados?.avatarUrl,
        metadados?.picture,
    ];

    return candidatos.find((valor) => String(valor || "").trim()) || "";
}

function obterIniciaisUsuarioAcessoApp(nome = "", email = "") {
    const textoBase = normalizarTextoAcesso(nome) || normalizarTextoAcesso(email).split("@")[0] || "Usuário";
    const partes = textoBase.split(/\s+/).filter(Boolean);

    if (partes.length >= 2) {
        return `${partes[0][0] || ""}${partes[1][0] || ""}`.toUpperCase();
    }

    return textoBase.slice(0, 2).toUpperCase() || "US";
}

function AvatarUsuarioAcessoApp({ usuario = null, nome = "", email = "" }) {
    const foto = obterFotoUsuarioAcessoApp(usuario);

    return (
        <FotoPessoaAcessoApp
            foto={foto}
            nome={nome}
            email={email}
            tamanhoClasse="h-16 w-16 text-lg"
            arredondamentoClasse="rounded-full"
        />
    );
}

function valorFotoAcessoEhUrlFinal(valor = "") {
    const texto = String(valor || "").trim();
    return /^https?:\/\//i.test(texto) || texto.startsWith("blob:") || texto.startsWith("data:");
}

function normalizarCaminhoFotoAcessoApp(valor = "") {
    const texto = String(valor || "").trim();
    if (!texto) return "";

    if (valorFotoAcessoEhUrlFinal(texto) && !texto.includes(`/storage/v1/object/`)) return texto;

    try {
        const url = new URL(texto);
        const partes = url.pathname.split("/").filter(Boolean);
        const indiceBucket = partes.findIndex((parte) => parte === BUCKET_FOTOS_USUARIOS_ACESSO_APP);
        if (indiceBucket >= 0 && partes.length > indiceBucket + 1) {
            return decodeURIComponent(partes.slice(indiceBucket + 1).join("/"));
        }
    } catch {
        // Mantém o valor original quando não for URL completa.
    }

    return texto
        .replace(new RegExp(`^${BUCKET_FOTOS_USUARIOS_ACESSO_APP}/`, "i"), "")
        .replace(/^\/+/, "")
        .trim();
}

function obterFotoPermissaoAcessoApp(usuario = {}) {
    return [
        usuario?.foto_url,
        usuario?.fotoUrl,
        usuario?.avatar_url,
        usuario?.avatarUrl,
        usuario?.picture,
    ].find((valor) => String(valor || "").trim()) || "";
}

function montarUrlPublicaFotoAcessoApp(caminho = "") {
    const valor = normalizarCaminhoFotoAcessoApp(caminho);

    if (!valor) return "";
    if (valorFotoAcessoEhUrlFinal(valor) && !valor.includes(`/storage/v1/object/`)) return valor;

    const { data } = supabase.storage
        .from(BUCKET_FOTOS_USUARIOS_ACESSO_APP)
        .getPublicUrl(valor);

    return data?.publicUrl || "";
}

async function resolverUrlFotoAcessoApp(caminho = "") {
    const valor = normalizarCaminhoFotoAcessoApp(caminho);

    if (!valor) return "";
    if (valorFotoAcessoEhUrlFinal(valor) && !valor.includes(`/storage/v1/object/`)) return valor;

    const chave = `${BUCKET_FOTOS_USUARIOS_ACESSO_APP}/${valor}`;

    if (FOTO_ACESSO_URL_CACHE.has(chave)) {
        return FOTO_ACESSO_URL_CACHE.get(chave) || "";
    }

    if (FOTO_ACESSO_PROMISE_CACHE.has(chave)) {
        return FOTO_ACESSO_PROMISE_CACHE.get(chave);
    }

    const promessa = (async () => {
        try {
            const { data, error } = await supabase.storage
                .from(BUCKET_FOTOS_USUARIOS_ACESSO_APP)
                .download(valor);

            if (!error && data) {
                const objectUrl = URL.createObjectURL(data);
                FOTO_ACESSO_URL_CACHE.set(chave, objectUrl);
                return objectUrl;
            }
        } catch {
            // Se o download autenticado falhar, tenta URL assinada.
        }

        try {
            const { data, error } = await supabase.storage
                .from(BUCKET_FOTOS_USUARIOS_ACESSO_APP)
                .createSignedUrl(valor, 60 * 60 * 6);

            if (!error && data?.signedUrl) {
                FOTO_ACESSO_URL_CACHE.set(chave, data.signedUrl);
                return data.signedUrl;
            }
        } catch {
            // Evita tentar carregar URL quebrada repetidamente no navegador.
        }

        return "";
    })();

    FOTO_ACESSO_PROMISE_CACHE.set(chave, promessa);

    try {
        return await promessa;
    } finally {
        FOTO_ACESSO_PROMISE_CACHE.delete(chave);
    }
}

function FotoPessoaAcessoApp({
    foto = "",
    preview = "",
    nome = "",
    email = "",
    grande = false,
    tamanhoClasse = "",
    arredondamentoClasse = "rounded-3xl",
}) {
    const valorFoto = preview || foto;
    const [urlFoto, setUrlFoto] = useState("");
    const [fotoComErro, setFotoComErro] = useState(false);
    const tamanho = tamanhoClasse || (grande ? "h-28 w-28 text-3xl" : "h-12 w-12 text-sm");

    useEffect(() => {
        let cancelado = false;
        const valor = normalizarCaminhoFotoAcessoApp(valorFoto);

        setFotoComErro(false);

        async function carregarUrl() {
            if (!valor) {
                setUrlFoto("");
                return;
            }

            const urlResolvida = await resolverUrlFotoAcessoApp(valor);
            if (!cancelado) {
                setUrlFoto(urlResolvida);
            }
        }

        carregarUrl();

        return () => {
            cancelado = true;
        };
    }, [valorFoto]);

    if (urlFoto && !fotoComErro) {
        return (
            <img
                src={urlFoto}
                alt={`Foto de ${nome || "usuário"}`}
                onError={() => setFotoComErro(true)}
                className={`${tamanho} shrink-0 ${arredondamentoClasse} object-cover ring-1 ring-slate-200`}
            />
        );
    }

    return (
        <div className={`${tamanho} flex shrink-0 items-center justify-center ${arredondamentoClasse} bg-blue-50 font-black text-slate-950 ring-1 ring-blue-100`}>
            {obterIniciaisUsuarioAcessoApp(nome, email)}
        </div>
    );
}

function limparNomeArquivoFotoAcessoApp(valor = "foto") {
    return String(valor || "foto")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase() || "foto";
}

async function enviarFotoUsuarioAcessoApp({ supabaseClient, arquivo, email }) {
    if (!arquivo) return "";

    const emailTratado = normalizarTextoAcesso(email).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "usuario";
    const extensao = limparNomeArquivoFotoAcessoApp(arquivo.name || "foto.jpg").split(".").pop() || "jpg";
    const caminho = `acessos-app/${emailTratado}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;

    const { error } = await supabaseClient.storage
        .from(BUCKET_FOTOS_USUARIOS_ACESSO_APP)
        .upload(caminho, arquivo, {
            cacheControl: "3600",
            upsert: true,
            contentType: arquivo.type || "image/jpeg",
        });

    if (error) {
        throw new Error(error.message || "Não foi possível subir a foto do usuário.");
    }

    return caminho;
}

function scrollParaSecaoAcessoApp(id) {
    if (typeof document === "undefined") return;

    const elemento = document.getElementById(id);
    if (!elemento) return;

    elemento.scrollIntoView({ behavior: "smooth", block: "start" });
}

function BotaoAcaoCabecalhoAcesso({ children, icon: Icon, principal = false, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                principal
                    ? "bg-slate-950 text-white ring-1 ring-slate-950 hover:bg-slate-800"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
        >
            {Icon ? <Icon className="h-4 w-4" strokeWidth={2.2} /> : null}
            {children}
        </button>
    );
}

function MiniResumoAcesso({ icon: Icon, valor, label, classeIcone = "bg-slate-50 text-slate-600", classeLinha = "bg-slate-300" }) {
    return (
        <div className="flex h-full min-h-[116px] flex-col items-center justify-center rounded-3xl bg-white px-3 py-4 text-center ring-1 ring-slate-200">
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${classeIcone}`}>
                {Icon ? <Icon className="h-5 w-5" strokeWidth={2.2} /> : null}
            </div>
            <p className="mt-3 text-2xl font-black leading-none text-slate-950">{valor}</p>
            <p className="mt-2 text-[11px] font-black text-slate-500">{label}</p>
            <span className={`mt-3 h-1 w-8 rounded-full ${classeLinha}`} />
        </div>
    );
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

function normalizarChaveAcessoApp(valor = "") {
    return normalizarTextoAcesso(valor)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function ehSolicitacaoRecuperacaoSenhaAcessoApp(item = {}) {
    const area = normalizarChaveAcessoApp(item.area_solicitada || item.tela || "");
    const observacao = normalizarChaveAcessoApp(item.observacao || item.resposta_admin || "");

    return area.includes("recuperacao de senha") || observacao.includes("recuperacao de senha");
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

async function registrarLogAcessoApp({
    usuario = null,
    acao = "",
    tabela = "usuarios_permissoes_sistema",
    registroId = null,
    descricao = "",
    dados = {},
} = {}) {
    if (!acao || !usuario?.email) return false;

    try {
        return await registrarAuditoriaSistemaService({
            supabase,
            usuario,
            acao,
            tabela,
            registroId,
            descricao,
            dados: {
                modulo: "acessos_app",
                tela: "Acessos do App",
                ...(dados || {}),
            },
        });
    } catch (error) {
        console.warn("Erro ao registrar log da aba Acessos do App:", error?.message || error);
        return false;
    }
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
    foto_url: "",
    fotoArquivo: null,
    fotoPreview: "",
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
        foto_url: obterFotoPermissaoAcessoApp(usuario),
        fotoArquivo: null,
        fotoPreview: "",
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

function SolicitacoesAcessoApp({ onPrepararPermissao = null, usuario = null }) {
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
            const acaoAuditoriaSolicitacao = {
                aprovada: "SOLICITACAO_ACESSO_APROVADA",
                recusada: "SOLICITACAO_ACESSO_RECUSADA",
                concluida: "SOLICITACAO_ACESSO_CONCLUIDA",
            }[statusResposta] || "SOLICITACAO_ACESSO_ATUALIZADA";

            await registrarLogAcessoApp({
                usuario,
                acao: acaoAuditoriaSolicitacao,
                tabela: "solicitacoes_acesso_sistema",
                registroId: solicitacao.id,
                descricao: `Solicitação de acesso ${formatarStatusSolicitacaoAcessoApp(statusResposta).toLowerCase()} para ${solicitacao.email || "usuário sem e-mail"}.`,
                dados: {
                    solicitacaoId: solicitacao.id,
                    email: solicitacao.email || "",
                    nome: solicitacao.nome || "",
                    areaSolicitada: solicitacao.area_solicitada || solicitacao.tela || "",
                    perfilAtual: solicitacao.perfil_atual || "",
                    statusAnterior: solicitacao.status || "pendente",
                    statusNovo: statusResposta,
                    respostaAdmin,
                },
            });

            setMensagem(`Solicitação ${formatarStatusSolicitacaoAcessoApp(statusResposta).toLowerCase()} com sucesso. Para solicitação aprovada, use Preparar permissão e depois Criar login do app.`);
        } catch (error) {
            setErro(error?.message || "Não foi possível atualizar a solicitação de acesso.");
            setMensagem("A solicitação não foi atualizada.");
        } finally {
            setProcessandoId("");
        }
    }

    function prepararSenhaTemporariaSolicitacao(solicitacao) {
        if (!solicitacao?.email) {
            setErro("A solicitação não possui e-mail para preparar a recuperação de senha.");
            return;
        }

        onPrepararPermissao?.({
            ...solicitacao,
            area_solicitada: "Recuperação de senha",
            perfil_atual: "consulta",
            observacao: solicitacao.observacao || "Recuperação de senha solicitada pelo login. Informe uma senha temporária e clique em Criar/atualizar login do app.",
            resposta_admin: solicitacao.resposta_admin || respostaAdmin || "",
            forcarResetSenhaTemporaria: true,
        });

        setMensagem(`Preparando recuperação de senha para ${solicitacao.email}. Informe uma senha temporária no cadastro do usuário e clique em Criar/atualizar login do app.`);

        setTimeout(() => {
            document.getElementById("acessos-lista-usuarios")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
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
                        {solicitacoesFiltradas.length > 0 ? solicitacoesFiltradas.map((item) => {
                            const solicitacaoRecuperacaoSenha = ehSolicitacaoRecuperacaoSenhaAcessoApp(item);
                            const podePrepararSenhaTemporaria = solicitacaoRecuperacaoSenha && !["recusada", "cancelada"].includes(normalizarTextoAcesso(item.status).toLowerCase());
                            const statusSolicitacaoTratado = normalizarTextoAcesso(item.status || "pendente").toLowerCase();
                            const textoRespostaAdmin = normalizarTextoAcesso(item.resposta_admin);
                            const mostrarRespostaAdministrativa = statusSolicitacaoTratado !== "pendente" || Boolean(textoRespostaAdmin);

                            return (
                                <article key={item.id || `${item.email}-${item.criado_em}`} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                                <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                    <div className="min-w-0 flex-1 text-left">
                                        <p className="truncate text-sm font-black text-slate-950">{item.nome || "Usuário sem nome"}</p>
                                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.email || "email não informado"}</p>
                                        <p className="mt-1 text-[11px] font-semibold text-slate-400">{formatarDataHoraAcessoApp(item.criado_em)}</p>
                                        {item.observacao ? <p className="mt-1 max-w-3xl text-xs font-semibold leading-relaxed text-slate-500">{item.observacao}</p> : null}
                                        {mostrarRespostaAdministrativa ? (
                                            <div className="mt-3 max-w-3xl rounded-2xl bg-white px-3 py-2 text-xs font-semibold leading-relaxed text-slate-600 ring-1 ring-slate-200">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Resposta administrativa</p>
                                                <p className="mt-1">{textoRespostaAdmin || "Sem resposta registrada pelo administrador."}</p>
                                                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                                                    Atualizado em: {formatarDataHoraAcessoApp(item.atualizado_em || item.criado_em)}
                                                </p>
                                            </div>
                                        ) : null}
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
                                        {podePrepararSenhaTemporaria ? (
                                            <button
                                                type="button"
                                                onClick={() => prepararSenhaTemporariaSolicitacao(item)}
                                                className="rounded-full bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white shadow-sm hover:bg-blue-700"
                                            >
                                                Preparar senha
                                            </button>
                                        ) : null}
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
                            );
                        }) : (
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

    function selecionarFotoFormulario(evento) {
        const arquivo = evento.target.files?.[0] || null;
        if (!arquivo) return;

        if (!arquivo.type?.startsWith("image/")) {
            setErro("Selecione um arquivo de imagem válido para a foto.");
            evento.target.value = "";
            return;
        }

        if (arquivo.size > 3 * 1024 * 1024) {
            setErro("A foto deve ter no máximo 3 MB.");
            evento.target.value = "";
            return;
        }

        setErro("");
        setFormulario((atual) => {
            if (atual.fotoPreview?.startsWith("blob:")) {
                URL.revokeObjectURL(atual.fotoPreview);
            }

            return {
                ...atual,
                fotoArquivo: arquivo,
                fotoPreview: URL.createObjectURL(arquivo),
            };
        });
    }

    function removerFotoFormulario() {
        setFormulario((atual) => {
            if (atual.fotoPreview?.startsWith("blob:")) {
                URL.revokeObjectURL(atual.fotoPreview);
            }

            return {
                ...atual,
                foto_url: "",
                fotoArquivo: null,
                fotoPreview: "",
            };
        });
    }

    async function prepararFormularioComFotoUpload(emailTratado) {
        const formularioTratado = {
            ...formulario,
            email: emailTratado,
            foto_url: normalizarTextoAcesso(formulario.foto_url),
        };

        if (!formulario.fotoArquivo) {
            return {
                ...formularioTratado,
                fotoAlterada: false,
            };
        }

        setMensagem("Enviando foto do usuário para o Storage...");

        const caminhoFoto = await enviarFotoUsuarioAcessoApp({
            supabaseClient: supabase,
            arquivo: formulario.fotoArquivo,
            email: emailTratado,
        });

        return {
            ...formularioTratado,
            foto_url: caminhoFoto,
            fotoAlterada: true,
            fotoArquivo: null,
            fotoPreview: "",
        };
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
            const formularioComFoto = await prepararFormularioComFotoUpload(emailTratado);
            const resultado = await criarLoginAppComSenhaTemporariaService({
                supabase,
                dados: {
                    ...formularioComFoto,
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
                    nome: permissaoSalva?.nome || formularioComFoto.nome,
                    funcao: permissaoSalva?.funcao || formularioComFoto.funcao,
                    empresa: permissaoSalva?.empresa || formularioComFoto.empresa,
                    foto_url: obterFotoPermissaoAcessoApp(permissaoSalva) || formularioComFoto.foto_url,
                    perfil: permissaoSalva?.perfil || formularioComFoto.perfil,
                    ativo: permissaoSalva?.ativo ?? formularioComFoto.ativo,
                    bloqueado: permissaoSalva?.bloqueado ?? formularioComFoto.bloqueado,
                    acesso_global: permissaoSalva?.acesso_global ?? permissaoSalva?.acessoGlobal ?? formularioComFoto.acesso_global,
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
                    fotoArquivo: null,
                    fotoPreview: "",
                });
            }

            await registrarLogAcessoApp({
                usuario,
                acao: "LOGIN_APP_CRIADO",
                tabela: "usuarios_permissoes_sistema",
                registroId: permissaoSalva?.id || permissaoSalva?.user_id || emailTratado,
                descricao: `Login do app criado ou atualizado para ${emailTratado}.`,
                dados: {
                    email: emailTratado,
                    nome: formularioComFoto.nome,
                    funcao: formularioComFoto.funcao,
                    empresa: formularioComFoto.empresa,
                    perfil: formularioComFoto.perfil,
                    ativo: formularioComFoto.ativo,
                    bloqueado: formularioComFoto.bloqueado,
                    acessoGlobal: formularioComFoto.acesso_global,
                    trocaSenhaObrigatoria: true,
                    fotoAlterada: Boolean(formularioComFoto.fotoAlterada),
                },
            });

            if (formularioComFoto.fotoAlterada) {
                await registrarLogAcessoApp({
                    usuario,
                    acao: "FOTO_ACESSO_ALTERADA",
                    tabela: "usuarios_permissoes_sistema",
                    registroId: permissaoSalva?.id || permissaoSalva?.user_id || emailTratado,
                    descricao: `Foto do acesso atualizada para ${emailTratado}.`,
                    dados: {
                        email: emailTratado,
                        foto_url: formularioComFoto.foto_url,
                        origem: "criar_login_app",
                    },
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
            const usuarioAnterior = usuarios.find((item) => (
                normalizarTextoAcesso(item.email).toLowerCase() === emailTratado
                || (formulario.id && item.id === formulario.id)
            )) || null;
            const formularioComFoto = await prepararFormularioComFotoUpload(emailTratado);
            const salvo = await salvarUsuarioPermissaoSistemaService({
                supabase,
                usuario: {
                    ...formularioComFoto,
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
                setFormulario({
                    ...montarFormularioUsuarioAcesso(salvo),
                    fotoArquivo: null,
                    fotoPreview: "",
                });
            }

            await registrarLogAcessoApp({
                usuario,
                acao: usuarioAnterior ? "PERMISSAO_ACESSO_SALVA" : "USUARIO_ADICIONADO",
                tabela: "usuarios_permissoes_sistema",
                registroId: salvo?.id || salvo?.user_id || emailTratado,
                descricao: usuarioAnterior
                    ? `Permissão do acesso atualizada para ${emailTratado}.`
                    : `Usuário adicionado à gestão de acessos: ${emailTratado}.`,
                dados: {
                    email: emailTratado,
                    nome: salvo?.nome || formularioComFoto.nome,
                    perfilAnterior: usuarioAnterior?.perfil || null,
                    perfilNovo: salvo?.perfil || formularioComFoto.perfil,
                    ativoAnterior: usuarioAnterior?.ativo ?? null,
                    ativoNovo: salvo?.ativo ?? formularioComFoto.ativo,
                    bloqueadoAnterior: usuarioAnterior?.bloqueado ?? null,
                    bloqueadoNovo: salvo?.bloqueado ?? formularioComFoto.bloqueado,
                    acessoGlobalAnterior: usuarioAnterior?.acesso_global ?? null,
                    acessoGlobalNovo: salvo?.acesso_global ?? formularioComFoto.acesso_global,
                    fotoAlterada: Boolean(formularioComFoto.fotoAlterada),
                },
            });

            if (usuarioAnterior && usuarioAnterior.perfil !== salvo?.perfil) {
                await registrarLogAcessoApp({
                    usuario,
                    acao: "PERFIL_ALTERADO",
                    tabela: "usuarios_permissoes_sistema",
                    registroId: salvo?.id || salvo?.user_id || emailTratado,
                    descricao: `Perfil de ${emailTratado} alterado de ${formatarPerfilAcessoApp(usuarioAnterior.perfil)} para ${formatarPerfilAcessoApp(salvo?.perfil)}.`,
                    dados: {
                        email: emailTratado,
                        perfilAnterior: usuarioAnterior.perfil,
                        perfilNovo: salvo?.perfil,
                    },
                });
            }

            if (usuarioAnterior && !usuarioAnterior.bloqueado && salvo?.bloqueado) {
                await registrarLogAcessoApp({
                    usuario,
                    acao: "USUARIO_BLOQUEADO",
                    tabela: "usuarios_permissoes_sistema",
                    registroId: salvo?.id || salvo?.user_id || emailTratado,
                    descricao: `Acesso bloqueado para ${emailTratado}.`,
                    dados: { email: emailTratado, perfil: salvo?.perfil },
                });
            }

            if (usuarioAnterior && usuarioAnterior.bloqueado && !salvo?.bloqueado) {
                await registrarLogAcessoApp({
                    usuario,
                    acao: "USUARIO_DESBLOQUEADO",
                    tabela: "usuarios_permissoes_sistema",
                    registroId: salvo?.id || salvo?.user_id || emailTratado,
                    descricao: `Acesso desbloqueado para ${emailTratado}.`,
                    dados: { email: emailTratado, perfil: salvo?.perfil },
                });
            }

            if (usuarioAnterior && !usuarioAnterior.acesso_global && salvo?.acesso_global) {
                await registrarLogAcessoApp({
                    usuario,
                    acao: "ACESSO_GLOBAL_CONCEDIDO",
                    tabela: "usuarios_permissoes_sistema",
                    registroId: salvo?.id || salvo?.user_id || emailTratado,
                    descricao: `Acesso global concedido para ${emailTratado}.`,
                    dados: { email: emailTratado, perfil: salvo?.perfil },
                });
            }

            if (usuarioAnterior && usuarioAnterior.acesso_global && !salvo?.acesso_global) {
                await registrarLogAcessoApp({
                    usuario,
                    acao: "ACESSO_GLOBAL_REMOVIDO",
                    tabela: "usuarios_permissoes_sistema",
                    registroId: salvo?.id || salvo?.user_id || emailTratado,
                    descricao: `Acesso global removido de ${emailTratado}.`,
                    dados: { email: emailTratado, perfil: salvo?.perfil },
                });
            }

            if (formularioComFoto.fotoAlterada) {
                await registrarLogAcessoApp({
                    usuario,
                    acao: "FOTO_ACESSO_ALTERADA",
                    tabela: "usuarios_permissoes_sistema",
                    registroId: salvo?.id || salvo?.user_id || emailTratado,
                    descricao: `Foto do acesso atualizada para ${emailTratado}.`,
                    dados: {
                        email: emailTratado,
                        foto_url: formularioComFoto.foto_url,
                        origem: "salvar_permissao",
                    },
                });
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
            await registrarLogAcessoApp({
                usuario,
                acao: "ACESSO_APP_EXCLUIDO",
                tabela: "usuarios_permissoes_sistema",
                registroId: idRemovido || emailRemovido || item.email,
                descricao: `Acesso do app excluído para ${emailRemovido || item.email}.`,
                dados: {
                    email: emailRemovido || item.email,
                    nome: item.nome || "",
                    perfil: item.perfil || "",
                    observacao: "Acesso removido definitivamente pela aba Acessos do App.",
                },
            });

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

        const recuperacaoSenha = ehSolicitacaoRecuperacaoSenhaAcessoApp(usuarioParaEditar);

        setFormulario(montarFormularioUsuarioAcesso({
            nome: usuarioParaEditar.nome || "",
            email: usuarioParaEditar.email || "",
            funcao: recuperacaoSenha ? "Usuário do app" : usuarioParaEditar.area_solicitada || usuarioParaEditar.tela || "",
            empresa: usuarioParaEditar.empresa || "",
            perfil: recuperacaoSenha ? "consulta" : usuarioParaEditar.perfil_atual === "Usuário sem perfil liberado" ? "consulta" : usuarioParaEditar.perfil_atual || "consulta",
            ativo: true,
            bloqueado: false,
            acesso_global: false,
            observacao: recuperacaoSenha
                ? "Recuperação de senha: informe uma senha temporária e clique em Criar/atualizar login do app."
                : usuarioParaEditar.observacao || usuarioParaEditar.resposta_admin || "Permissão preparada a partir de solicitação de acesso aprovada.",
            senhaTemporaria: "",
            confirmarSenhaTemporaria: "",
            resetarSenhaTemporaria: recuperacaoSenha || Boolean(usuarioParaEditar.forcarResetSenhaTemporaria),
        }));
        setFormAberto(true);
        setMensagem(recuperacaoSenha
            ? `Preparando recuperação de senha para ${usuarioParaEditar.email || "usuário"}. Informe uma senha temporária e clique em Criar/atualizar login do app.`
            : `Preparando permissão para ${usuarioParaEditar.email || "solicitação aprovada"}. Revise o perfil antes de salvar.`
        );
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
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Edição de permissão</p>
                            <h4 className="mt-1 text-lg font-black text-slate-950">{formulario.id ? "Editar pessoa com acesso ao app" : "Cadastrar login de acesso"}</h4>
                            <p className="mt-1 max-w-5xl text-xs font-semibold leading-5 text-slate-500">
                                Dados principais, foto, senha temporária e status ficam no mesmo bloco. Ao escolher um perfil, o padrão editável salvo em Perfis padrão será aplicado às permissões do usuário.
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

                    <div className="mt-4 grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
                        <section className="rounded-3xl bg-white p-4 ring-1 ring-slate-200">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Foto do acesso</p>
                                    <p className="mt-1 text-xs font-bold leading-5 text-slate-500">Use para identificação visual do usuário.</p>
                                </div>
                                <Camera className="h-5 w-5 text-slate-400" strokeWidth={2.2} />
                            </div>

                            <div className="mt-4 flex flex-col items-center text-center">
                                <FotoPessoaAcessoApp
                                    foto={formulario.foto_url}
                                    preview={formulario.fotoPreview}
                                    nome={formulario.nome}
                                    email={formulario.email}
                                    grande
                                />
                                <p className="mt-3 max-w-[190px] truncate text-sm font-black text-slate-950">{formulario.nome || "Usuário sem nome"}</p>
                                <p className="mt-0.5 max-w-[210px] truncate text-[11px] font-semibold text-slate-500">{formulario.email || "email não informado"}</p>
                            </div>

                            <div className="mt-4 grid gap-2">
                                <input
                                    id="foto-acesso-app-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={selecionarFotoFormulario}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="foto-acesso-app-input"
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-slate-800"
                                >
                                    <ImagePlus className="h-4 w-4" strokeWidth={2.2} />
                                    Subir foto
                                </label>
                                {(formulario.foto_url || formulario.fotoPreview) ? (
                                    <button
                                        type="button"
                                        onClick={removerFotoFormulario}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-rose-700 ring-1 ring-rose-100 hover:bg-rose-50"
                                    >
                                        <X className="h-4 w-4" strokeWidth={2.2} />
                                        Remover foto
                                    </button>
                                ) : null}
                            </div>
                            <p className="mt-3 text-center text-[10px] font-semibold leading-4 text-slate-400">JPG, PNG ou WEBP até 3 MB. A imagem será salva no Storage.</p>
                        </section>

                        <section className="grid content-start gap-3">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                <label className="block xl:col-span-1">
                                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Nome</span>
                                    <input
                                        value={formulario.nome}
                                        onChange={(evento) => atualizarCampoFormulario("nome", evento.target.value)}
                                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                        placeholder="Nome completo"
                                    />
                                </label>
                                <label className="block xl:col-span-1">
                                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">E-mail</span>
                                    <input
                                        value={formulario.email}
                                        onChange={(evento) => atualizarCampoFormulario("email", evento.target.value)}
                                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                        placeholder="usuario@empresa.com"
                                    />
                                </label>
                                <label className="block xl:col-span-1">
                                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Empresa</span>
                                    <input
                                        value={formulario.empresa}
                                        onChange={(evento) => atualizarCampoFormulario("empresa", evento.target.value)}
                                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                        placeholder="Empresa / contrato"
                                    />
                                </label>
                                <label className="block xl:col-span-1">
                                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Função</span>
                                    <input
                                        value={formulario.funcao}
                                        onChange={(evento) => atualizarCampoFormulario("funcao", evento.target.value)}
                                        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                        placeholder="Função / área"
                                    />
                                </label>
                                <label className="block xl:col-span-1">
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

                            <div className="grid gap-3 md:grid-cols-3">
                                <label className={`rounded-2xl bg-white p-3 ring-1 ${formulario.ativo ? "ring-emerald-100" : "ring-slate-200"}`}>
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
                                            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">Libera acesso conforme perfil.</p>
                                        </div>
                                    </div>
                                </label>
                                <label className={`rounded-2xl bg-white p-3 ring-1 ${formulario.bloqueado ? "ring-rose-100" : "ring-slate-200"}`}>
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={formulario.bloqueado}
                                            onChange={(evento) => atualizarCampoFormulario("bloqueado", evento.target.checked)}
                                            className="mt-1"
                                        />
                                        <div>
                                            <p className="text-xs font-black text-slate-950">Bloqueado</p>
                                            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">Impede acesso operacional.</p>
                                        </div>
                                    </div>
                                </label>
                                <label className={`rounded-2xl bg-white p-3 ring-1 ${formulario.acesso_global ? "ring-blue-100" : "ring-slate-200"}`}>
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
                                            <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">Somente Administrador.</p>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
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
                                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Confirmar senha</span>
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
                                        <span className="mt-1 block text-[11px] font-semibold leading-5 text-slate-500">Para login já existente.</span>
                                    </span>
                                </label>
                            </div>

                            <div className="rounded-2xl bg-blue-50 px-3 py-2 text-[11px] font-bold leading-5 text-blue-700 ring-1 ring-blue-100">
                                Ao salvar, o padrão editável do perfil selecionado será aplicado às permissões do usuário.
                            </div>

                            <label className="block">
                                <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Observação administrativa</span>
                                <textarea
                                    value={formulario.observacao}
                                    onChange={(evento) => atualizarCampoFormulario("observacao", evento.target.value)}
                                    rows={2}
                                    className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    placeholder="Exemplo: acesso liberado para auditoria, perfil criado por solicitação aprovada..."
                                />
                            </label>
                        </section>
                    </div>

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
                            onClick={() => {
                                if (formulario.fotoPreview?.startsWith("blob:")) {
                                    URL.revokeObjectURL(formulario.fotoPreview);
                                }
                                setFormulario(montarFormularioUsuarioAcesso());
                            }}
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
                        <div className="grid w-full gap-3 xl:grid-cols-[minmax(260px,1fr)_minmax(0,auto)] xl:items-center">
                            <div className="flex min-w-0 items-center gap-3 text-left">
                                <FotoPessoaAcessoApp
                                    foto={obterFotoPermissaoAcessoApp(item)}
                                    nome={item.nome}
                                    email={item.email}
                                />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-black text-slate-950">{item.nome || "Usuário sem nome"}</p>
                                    <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{item.email || "email não informado"}</p>
                                    <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{item.empresa || "empresa não informada"}</p>
                                    <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">{item.funcao || "função não informada"}</p>
                                </div>
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

function montarCodigoConfirmacaoAplicarPerfil(perfil = null) {
    const nomePerfil = normalizarTextoAcesso(perfil?.nome || perfil?.perfil || perfil?.chave || "perfil").toUpperCase();
    return `APLICAR ${nomePerfil}`;
}

function RevisaoPerfisPadrao({ usuario = null }) {
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
    const [aplicandoPerfil, setAplicandoPerfil] = useState(false);
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
            await registrarLogAcessoApp({
                usuario,
                acao: "PERFIL_PADRAO_EDITADO",
                tabela: "perfis_permissoes_sistema",
                registroId: perfilTela.chave,
                descricao: `Perfil padrão ${perfilTela.perfil || perfilTela.nome} editado na aba Acessos do App.`,
                dados: {
                    chave: perfilTela.chave,
                    nome: perfilTela.nome || perfilTela.perfil,
                    modulosLiberados: perfilTela.modulosLiberados || [],
                    acoesLiberadas: perfilTela.acoesLiberadas || [],
                    acoesRestritas: perfilTela.acoesRestritas || [],
                },
            });

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
            await registrarLogAcessoApp({
                usuario,
                acao: "PERFIL_PADRAO_RESTAURADO",
                tabela: "perfis_permissoes_sistema",
                registroId: perfilTela.chave,
                descricao: `Perfil padrão ${perfilTela.perfil || perfilTela.nome} restaurado para o padrão original.`,
                dados: {
                    chave: perfilTela.chave,
                    nome: perfilTela.nome || perfilTela.perfil,
                },
            });

            setMensagemPerfil("Perfil restaurado para o padrão original do sistema.");
        } catch (error) {
            setErroPerfil(error?.message || "Não foi possível restaurar o perfil padrão.");
        } finally {
            setSalvandoPerfil(false);
        }
    }

    async function aplicarPerfilAosUsuariosExistentes() {
        if (!perfilSelecionado?.chave || aplicandoPerfil || salvandoPerfil || modoEdicao) return;

        const codigoConfirmacao = montarCodigoConfirmacaoAplicarPerfil(perfilSelecionado);
        const resposta = window.prompt(
            `Esta ação vai substituir as permissões de todos os usuários existentes com perfil ${perfilSelecionado.perfil || perfilSelecionado.nome}.

Digite ${codigoConfirmacao} para confirmar.`
        );

        if (resposta === null) return;

        if (normalizarTextoAcesso(resposta).toUpperCase() !== codigoConfirmacao) {
            setErroPerfil(`Confirmação inválida. Para aplicar este perfil, digite exatamente: ${codigoConfirmacao}`);
            setMensagemPerfil("");
            return;
        }

        setAplicandoPerfil(true);
        setErroPerfil("");
        setMensagemPerfil(`Aplicando o perfil ${perfilSelecionado.perfil || perfilSelecionado.nome} aos usuários existentes...`);

        try {
            const resultado = await aplicarPerfilPermissaoUsuariosSistemaService({
                supabase,
                chave: perfilSelecionado.chave,
                confirmacao: codigoConfirmacao,
            });

            await registrarLogAcessoApp({
                usuario,
                acao: "PERFIL_PADRAO_APLICADO_USUARIOS",
                tabela: "usuarios_permissoes_sistema",
                registroId: perfilSelecionado.chave,
                descricao: `Perfil ${perfilSelecionado.perfil || perfilSelecionado.nome} aplicado a ${resultado.usuariosAtualizados} usuário(s) existente(s).`,
                dados: {
                    chave: perfilSelecionado.chave,
                    nome: perfilSelecionado.perfil || perfilSelecionado.nome,
                    usuariosAtualizados: resultado.usuariosAtualizados,
                    confirmacao: codigoConfirmacao,
                },
            });

            setMensagemPerfil(`Perfil ${perfilSelecionado.perfil || perfilSelecionado.nome} aplicado a ${resultado.usuariosAtualizados} usuário(s) existente(s). Atualize a lista de usuários para conferir.`);
        } catch (error) {
            setErroPerfil(error?.message || "Não foi possível aplicar o perfil aos usuários existentes.");
            setMensagemPerfil("");
        } finally {
            setAplicandoPerfil(false);
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
                            Edite a regra base de cada perfil. Depois de salvar, aplique o padrão aos usuários existentes do mesmo perfil quando quiser atualizar todos de uma vez.
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
                            disabled={!perfilSelecionado || carregandoPerfis || salvandoPerfil || aplicandoPerfil}
                            className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {modoEdicao ? "Cancelar edição" : "Editar perfil"}
                        </button>
                    ) : null}
                    {perfisAberto ? (
                        <button
                            type="button"
                            onClick={aplicarPerfilAosUsuariosExistentes}
                            disabled={!perfilSelecionado || carregandoPerfis || salvandoPerfil || aplicandoPerfil || modoEdicao}
                            className="rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 ring-1 ring-amber-100 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            title={modoEdicao ? "Salve ou cancele a edição antes de aplicar aos usuários." : "Aplicar este padrão aos usuários existentes com o mesmo perfil."}
                        >
                            {aplicandoPerfil ? "Aplicando..." : "Aplicar aos usuários"}
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

                    {!modoEdicao ? (
                        <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800 ring-1 ring-amber-100">
                            Para aplicar este padrão aos usuários já cadastrados com este perfil, use o botão <span className="font-black">Aplicar aos usuários</span>. A ação exige confirmação digitada.
                        </div>
                    ) : null}

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
                                    disabled={salvandoPerfil || aplicandoPerfil}
                                    className="rounded-full bg-slate-950 px-5 py-3 text-xs font-black text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {salvandoPerfil ? "Salvando perfil" : "Salvar perfil padrão"}
                                </button>
                                <button
                                    type="button"
                                    onClick={restaurarPerfil}
                                    disabled={salvandoPerfil || aplicandoPerfil}
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
    const [resumoCabecalho, setResumoCabecalho] = useState({
        ativos: null,
        bloqueados: null,
        perfis: PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.length,
        pendentes: null,
    });
    const [usuarioResumoAtual, setUsuarioResumoAtual] = useState(null);
    const usuarioCabecalho = useMemo(() => ({
        ...(usuario || {}),
        ...(usuarioResumoAtual || {}),
        user_metadata: {
            ...(usuario?.user_metadata || {}),
            ...(usuarioResumoAtual?.user_metadata || {}),
            foto_url: obterFotoPermissaoAcessoApp(usuarioResumoAtual) || usuario?.user_metadata?.foto_url || usuario?.user_metadata?.avatar_url || usuario?.user_metadata?.picture || "",
        },
    }), [usuario, usuarioResumoAtual]);
    const nomeUsuario = obterNomeUsuario(usuarioCabecalho);
    const emailUsuario = usuarioCabecalho?.email || usuario?.email || "E-mail não informado";
    const perfilUsuarioAtual = formatarPerfilAcessoApp(
        usuarioResumoAtual?.perfil || usuarioCabecalho?.perfil || usuarioCabecalho?.perfilAtual || usuarioCabecalho?.user_metadata?.perfil || "administrador"
    );

    useEffect(() => {
        let ativo = true;

        async function carregarResumoCabecalho() {
            try {
                const [resultadoUsuarios, resultadoSolicitacoes, resultadoPerfis] = await Promise.allSettled([
                    listarUsuariosPermissoesSistemaService({ supabase }),
                    listarSolicitacoesAcessoSistemaService({ supabase }),
                    listarPerfisPermissoesSistemaService({ supabase }),
                ]);

                if (!ativo) return;

                const usuarios = resultadoUsuarios.status === "fulfilled" && Array.isArray(resultadoUsuarios.value)
                    ? resultadoUsuarios.value
                    : [];
                const solicitacoes = resultadoSolicitacoes.status === "fulfilled" && Array.isArray(resultadoSolicitacoes.value)
                    ? resultadoSolicitacoes.value
                    : [];
                const perfis = resultadoPerfis.status === "fulfilled" && Array.isArray(resultadoPerfis.value)
                    ? resultadoPerfis.value
                    : [];

                const emailAtual = normalizarTextoAcesso(usuario?.email).toLowerCase();
                const idAtual = usuario?.id || usuario?.user_id || "";
                const permissaoAtual = usuarios.find((item) => (
                    (emailAtual && normalizarTextoAcesso(item.email).toLowerCase() === emailAtual)
                    || (idAtual && (item.user_id === idAtual || item.id === idAtual))
                )) || null;

                setUsuarioResumoAtual(permissaoAtual);

                setResumoCabecalho({
                    ativos: usuarios.filter((item) => !item.excluido && item.ativo && !item.bloqueado).length,
                    bloqueados: usuarios.filter((item) => !item.excluido && item.bloqueado).length,
                    perfis: perfis.filter((item) => item.ativo !== false).length || PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.length,
                    pendentes: solicitacoes.filter((item) => normalizarTextoAcesso(item.status || "pendente").toLowerCase() === "pendente").length,
                });
            } catch {
                if (!ativo) return;
                setResumoCabecalho((atual) => ({
                    ...atual,
                    perfis: atual.perfis || PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.length,
                }));
            }
        }

        carregarResumoCabecalho();

        return () => {
            ativo = false;
        };
    }, [usuario?.email, usuario?.id, usuario?.user_id]);

    return (
        <div className="page-shell space-y-5">
            <Card className="overflow-hidden border border-slate-200 bg-white p-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="grid gap-0 lg:grid-cols-[0.56fr_0.44fr]">
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

                        <div className="mt-5 space-y-2 text-sm font-semibold leading-6 text-slate-500">
                            <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-blue-600" strokeWidth={2.2} />
                                <span>Central de gestão de acessos e perfis do sistema SST.</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <UsersRound className="h-4 w-4 text-blue-600" strokeWidth={2.2} />
                                <span>Garanta segurança e controle total sobre quem acessa o sistema.</span>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <BotaoAcaoCabecalhoAcesso
                                principal
                                icon={UserPlus}
                                onClick={() => scrollParaSecaoAcessoApp("acessos-lista-usuarios")}
                            >
                                Cadastrar login
                            </BotaoAcaoCabecalhoAcesso>
                            <BotaoAcaoCabecalhoAcesso
                                icon={RefreshCw}
                                onClick={() => scrollParaSecaoAcessoApp("acessos-lista-usuarios")}
                            >
                                Atualizar usuários
                            </BotaoAcaoCabecalhoAcesso>
                            <BotaoAcaoCabecalhoAcesso
                                icon={ClipboardList}
                                onClick={() => scrollParaSecaoAcessoApp("acessos-solicitacoes")}
                            >
                                Solicitações
                            </BotaoAcaoCabecalhoAcesso>
                            <BotaoAcaoCabecalhoAcesso
                                icon={ShieldCheck}
                                onClick={() => scrollParaSecaoAcessoApp("acessos-perfis")}
                            >
                                Editar perfis
                            </BotaoAcaoCabecalhoAcesso>
                        </div>

                        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm font-bold leading-6 text-emerald-800">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.2} />
                                <p>
                                    Login real, senha temporária e troca obrigatória de senha estão centralizados nesta área.
                                </p>
                            </div>
                        </div>
                    </section>

                    <aside className="border-t border-slate-200 bg-white px-6 py-7 sm:px-8 lg:border-l lg:border-t-0">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-950">Resumo do acesso</p>
                            <span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                                <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.2} />
                                Atualizado agora
                            </span>
                        </div>

                        <div className="mt-4 rounded-3xl bg-white p-5 ring-1 ring-slate-200">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                                <AvatarUsuarioAcessoApp usuario={usuarioCabecalho} nome={nomeUsuario} email={emailUsuario} />
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-400">Usuário atual</p>
                                    <p className="mt-1 truncate text-base font-black text-slate-950">{nomeUsuario}</p>
                                    <p className="mt-1 truncate text-xs font-bold text-slate-500">{emailUsuario}</p>
                                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                                        <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.2} />
                                        {perfilUsuarioAtual}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                            <MiniResumoAcesso
                                icon={UsersRound}
                                valor={resumoCabecalho.ativos ?? "--"}
                                label="Ativos"
                                classeIcone="bg-blue-50 text-blue-700"
                                classeLinha="bg-blue-500"
                            />
                            <MiniResumoAcesso
                                icon={LockKeyhole}
                                valor={resumoCabecalho.bloqueados ?? "--"}
                                label="Bloqueados"
                                classeIcone="bg-rose-50 text-rose-700"
                                classeLinha="bg-rose-500"
                            />
                            <MiniResumoAcesso
                                icon={UsersRound}
                                valor={resumoCabecalho.perfis ?? PERFIS_USUARIOS_PERMISSOES_PLANEJADOS.length}
                                label="Perfis"
                                classeIcone="bg-violet-50 text-violet-700"
                                classeLinha="bg-violet-500"
                            />
                            <MiniResumoAcesso
                                icon={ClipboardList}
                                valor={resumoCabecalho.pendentes ?? "--"}
                                label="Pendentes"
                                classeIcone="bg-orange-50 text-orange-700"
                                classeLinha="bg-orange-500"
                            />
                        </div>
                    </aside>
                </div>
            </Card>

            <div id="acessos-lista-usuarios" className="scroll-mt-24">
                <UsuariosCadastradosApp
                    usuario={usuario}
                    usuarioParaEditar={solicitacaoParaPermissao}
                    onEdicaoConsumida={() => setSolicitacaoParaPermissao(null)}
                />
            </div>

            <div id="acessos-solicitacoes" className="scroll-mt-24">
                <SolicitacoesAcessoApp usuario={usuario} onPrepararPermissao={setSolicitacaoParaPermissao} />
            </div>

            <div id="acessos-perfis" className="scroll-mt-24">
                <RevisaoPerfisPadrao usuario={usuario} />
            </div>

        </div>
    );
}

export default AcessosAppPage;
