import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "../lib/supabaseClient";
import { useStorageUrl } from "../hooks/useStorageUrl";
import { classNames } from "../utils/sstUtils";
import { QrCodeComLogo } from "./qr/QrCodeComLogo";

export function obterFotoColaboradorSrc(colaboradorOuSrc = {}) {
    if (!colaboradorOuSrc) return "";

    if (typeof colaboradorOuSrc === "string") {
        return colaboradorOuSrc.trim();
    }

    if (typeof colaboradorOuSrc !== "object") {
        return "";
    }

    const candidatos = [
        colaboradorOuSrc.fotoUrl,
        colaboradorOuSrc.foto_url,
        colaboradorOuSrc.fotoPath,
        colaboradorOuSrc.foto_path,
        colaboradorOuSrc.fotoStoragePath,
        colaboradorOuSrc.foto_storage_path,
        colaboradorOuSrc.fotoColaborador,
        colaboradorOuSrc.foto_colaborador,
        colaboradorOuSrc.foto,
        colaboradorOuSrc.avatarUrl,
        colaboradorOuSrc.avatar_url,
        colaboradorOuSrc.imagemUrl,
        colaboradorOuSrc.imagem_url,
        colaboradorOuSrc.imagem,
        colaboradorOuSrc.path,
        colaboradorOuSrc.caminho,
        colaboradorOuSrc.caminhoStorage,
        colaboradorOuSrc.caminho_storage,
    ];

    const encontrado = candidatos.find((valor) => typeof valor === "string" && valor.trim());
    return encontrado ? encontrado.trim() : "";
}

function obterIdColaboradorFoto(colaboradorOuSrc = {}, colaboradorId = "") {
    if (colaboradorId) return String(colaboradorId);
    if (!colaboradorOuSrc || typeof colaboradorOuSrc !== "object") return "";

    return String(
        colaboradorOuSrc.id ||
        colaboradorOuSrc.colaboradorId ||
        colaboradorOuSrc.colaborador_id ||
        colaboradorOuSrc.funcionarioId ||
        colaboradorOuSrc.funcionario_id ||
        ""
    ).trim();
}

function normalizarCaminhoStorageFotoColaborador(valor = "") {
    const texto = String(valor || "").trim();
    if (!texto) return "";

    if (/^(data:|blob:)/i.test(texto)) {
        return texto;
    }

    const semQuery = texto.split("?")[0];
    const marcadorStorage = "/storage/v1/object/";
    const marcadorBucket = "/fotos-colaboradores/";

    if (/^https?:\/\//i.test(texto) && semQuery.includes(marcadorStorage) && semQuery.includes(marcadorBucket)) {
        const posicao = semQuery.indexOf(marcadorBucket);
        return decodeURIComponent(semQuery.slice(posicao + marcadorBucket.length));
    }

    if (/^https?:\/\//i.test(texto)) {
        return texto;
    }

    return texto
        .replace(/^fotos-colaboradores\//i, "")
        .replace(/^\/+/g, "")
        .trim();
}

function escolherArquivoFotoMaisRecente(arquivos = []) {
    const imagens = (arquivos || [])
        .filter((arquivo) => arquivo?.name && !arquivo.name.endsWith("/"))
        .filter((arquivo) => /\.(png|jpe?g|webp|gif|bmp)$/i.test(arquivo.name));

    return imagens[0] || (arquivos || []).find((arquivo) => arquivo?.name && !arquivo.name.endsWith("/")) || null;
}

export function FotoColaborador({ src, colaborador = null, colaboradorId = "", nome, className = "h-12 w-12", iconClassName = "h-5 w-5" }) {
    const origem = colaborador || src;
    const idParaBusca = obterIdColaboradorFoto(origem, colaboradorId);
    const [erroImagem, setErroImagem] = useState(false);
    const [caminhoFallback, setCaminhoFallback] = useState("");
    const [tentouFallback, setTentouFallback] = useState(false);

    const srcNormalizada = normalizarCaminhoStorageFotoColaborador(obterFotoColaboradorSrc(origem));
    const caminhoPreferencial = erroImagem && caminhoFallback ? caminhoFallback : srcNormalizada || caminhoFallback;
    const fonteExterna = /^(https?:|data:|blob:)/i.test(caminhoPreferencial);
    const urlAssinada = useStorageUrl("fotos-colaboradores", fonteExterna ? "" : caminhoPreferencial, 600);
    const url = fonteExterna ? caminhoPreferencial : urlAssinada;

    useEffect(() => {
        setErroImagem(false);
    }, [caminhoPreferencial]);

    useEffect(() => {
        let ativo = true;

        async function buscarFotoPorPastaColaborador() {
            if (!idParaBusca || tentouFallback) return;
            if (srcNormalizada && !erroImagem) return;

            setTentouFallback(true);

            try {
                const { data, error } = await supabase.storage
                    .from("fotos-colaboradores")
                    .list(idParaBusca, {
                        limit: 50,
                        sortBy: { column: "created_at", order: "desc" },
                    });

                if (error || !ativo) return;

                const arquivo = escolherArquivoFotoMaisRecente(data || []);
                if (arquivo?.name) {
                    setCaminhoFallback(`${idParaBusca}/${arquivo.name}`);
                }
            } catch {
                // Mantém o placeholder quando não houver política de leitura/listagem para o bucket.
            }
        }

        buscarFotoPorPastaColaborador();

        return () => {
            ativo = false;
        };
    }, [idParaBusca, srcNormalizada, erroImagem, tentouFallback]);

    if (!url || erroImagem) {
        return (
            <div className={classNames("flex shrink-0 items-center justify-center overflow-hidden bg-slate-100 text-slate-500", className)}>
                <UserRound className={iconClassName} />
            </div>
        );
    }

    return (
        <img
            src={url}
            alt={`Foto ${nome || "colaborador"}`}
            className={classNames("shrink-0 object-cover", className)}
            loading="lazy"
            onError={() => setErroImagem(true)}
        />
    );
}

export function FotoAuditoriaPreview({ url, label }) {
    const [erro, setErro] = useState(false);
    const urlAssinada = useStorageUrl("auditorias-campo", url, 600);
    if (!url) return null;

    return (
        <a href={urlAssinada || "#"} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 transition hover:ring-slate-300">
            {urlAssinada && !erro ? (
                <img
                    src={urlAssinada}
                    alt={label}
                    className="h-44 w-full bg-slate-100 object-contain"
                    loading="lazy"
                    onError={() => setErro(true)}
                />
            ) : (
                <div className="flex h-44 items-center justify-center bg-slate-100 px-3 text-center text-xs font-semibold text-slate-500">
                    Miniatura indisponível. Clique para abrir a foto.
                </div>
            )}
            <span className="flex items-center justify-between gap-2 px-3 py-2 text-xs font-bold text-slate-600">
                {label}
                <Eye className="h-3.5 w-3.5" />
            </span>
        </a>
    );
}

export function SupabaseConfiguracaoPendente() {
    const exemploEnv = `VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA`;

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 text-white">
            <div className="w-full max-w-3xl rounded-[2rem] bg-white p-6 text-slate-900 shadow-2xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">Configuração obrigatória</p>
                        <h1 className="mt-2 text-2xl font-black text-slate-950">Supabase não configurado</h1>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            O sistema abriu sem travar, mas ainda falta configurar as variáveis do Supabase.
                            Enquanto elas estiverem vazias, login, banco de dados, arquivos e auditorias não funcionarão.
                        </p>
                    </div>
                    <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 ring-1 ring-red-100">
                        .env ausente ou não lido
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-sm font-black text-slate-900">1. Crie ou corrija o arquivo .env</p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-600">
                            O arquivo precisa ficar na raiz do projeto, no mesmo nível do package.json. O nome deve ser exatamente .env.
                        </p>
                        <pre className="mt-3 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-white"><code>{exemploEnv}</code></pre>
                    </div>

                    <div className="rounded-3xl bg-blue-50 p-4 ring-1 ring-blue-100">
                        <p className="text-sm font-black text-blue-950">2. Reinicie o Vite</p>
                        <p className="mt-2 text-xs leading-relaxed text-blue-900">
                            Depois de salvar o .env, pare o servidor no terminal com CTRL + C e rode novamente npm run dev.
                            As variáveis VITE_ só são carregadas quando o servidor inicia.
                        </p>
                        <div className="mt-3 rounded-2xl bg-white p-3 text-xs font-bold text-blue-900 ring-1 ring-blue-100">
                            Variáveis detectadas agora:<br />
                            VITE_SUPABASE_URL: {SUPABASE_URL ? "preenchida" : "vazia"}<br />
                            VITE_SUPABASE_ANON_KEY: {SUPABASE_ANON_KEY ? "preenchida" : "vazia"}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function StatusPill({ status, small = false }) {
    const Icon = status.icon;
    const textoStatus =
        status.chave === "vencendo"
            ? "A vencer"
            : String(status.texto || "")
                .replace(/A vencer/gi, "A vencer")
                .replace(/A vencer/gi, "A vencer")
                .replace(/A vencer/gi, "A vencer")
                .replace(/Vencendo/gi, "A vencer")
                .replace(/A vencer/gi, "A vencer");

    return (
        <span
            translate="no"
            className={classNames(
                "notranslate inline-flex min-w-[72px] items-center justify-center gap-1 whitespace-nowrap rounded-full text-center ring-1",
                status.classe,
                small ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm font-medium"
            )}
        >
            <Icon className={small ? "h-3.5 w-3.5" : "h-4 w-4"} />
            {textoStatus}
        </span>
    );
}

export function QRCodeReal({ token, size = 150 }) {
    const urlConsulta = `${window.location.origin}/?qr=${encodeURIComponent(token)}`;

    return (
        <div className="flex max-w-full items-center justify-center overflow-hidden rounded-3xl bg-white p-3 shadow-inner ring-1 ring-slate-200">
            <QrCodeComLogo
                value={urlConsulta}
                size={size}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#0f172a"
                logoRatio={0.26}
            />
        </div>
    );
}
export function LinkPublicoQR({ token }) {
    const urlConsulta = `${window.location.origin}/?qr=${encodeURIComponent(token)}`;

    return (
        <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">Link público</span>
            <span className="min-w-0 max-w-[360px] truncate text-[11px] text-slate-500" title={urlConsulta}>{urlConsulta}</span>
        </div>
    );
}

export function Card({ children, className = "" }) {
    return (
        <div className={classNames("min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5", className)}>
            {children}
        </div>
    );
}

export function CardRecolhivel({
    titulo,
    subtitulo,
    contador,
    acao,
    children,
    className = "",
    defaultOpen = true,
    compacto = false,
    persistKey = "",
}) {
    const chavePersistencia = persistKey || `cardRecolhivel:${titulo || "sem-titulo"}:${subtitulo || ""}`;
    const [aberto, setAberto] = useState(() => {
        if (typeof window === "undefined") return defaultOpen;
        try {
            const salvo = window.localStorage.getItem(chavePersistencia);
            return salvo === null ? defaultOpen : salvo === "true";
        } catch {
            return defaultOpen;
        }
    });

    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            window.localStorage.setItem(chavePersistencia, String(aberto));
        } catch {
            // Ignora localStorage indisponível.
        }
    }, [aberto, chavePersistencia]);

    return (
        <Card className={classNames("transition-all", className)}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <button
                    type="button"
                    onClick={() => setAberto((atual) => !atual)}
                    className="flex min-w-0 flex-1 items-start justify-between gap-3 rounded-2xl text-left transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100"
                >
                    <div className="min-w-0 p-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className={classNames(compacto ? "text-sm" : "text-lg", "font-bold text-slate-950")}>{titulo}</h2>
                            {contador !== undefined && contador !== null && (
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
                                    {contador}
                                </span>
                            )}
                        </div>

                        {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
                    </div>

                    <span className="mt-1 flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200">
                        {aberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {aberto ? "Recolher" : "Abrir"}
                    </span>
                </button>

                {acao && (
                    <div className="shrink-0" onClick={(evento) => evento.stopPropagation()}>
                        {acao}
                    </div>
                )}
            </div>

            {aberto && <div className={classNames(compacto ? "mt-3" : "mt-4")}>{children}</div>}
        </Card>
    );
}

export function Header({ titulo, subtitulo, acao, className = "", subtituloClassName = "" }) {
    return (
        <header className={classNames("page-header mb-6", className)}>
            <div className="page-header-text min-w-0">
                <h1 className="texto-quebra-segura text-[1.45rem] font-bold tracking-tight text-slate-950">{titulo}</h1>
                {subtitulo && (
                    <p className={classNames("mt-1 max-w-3xl text-sm leading-6 text-slate-500", subtituloClassName)}>
                        {subtitulo}
                    </p>
                )}
            </div>
            {acao && <div className="page-actions">{acao}</div>}
        </header>
    );
}



export function PageShell({ children, className = "" }) {
    return <div className={classNames("page-shell", className)}>{children}</div>;
}

export function PageActions({ children, className = "" }) {
    return <div className={classNames("page-actions", className)}>{children}</div>;
}

export function CardsGrid({ children, className = "" }) {
    return <div className={classNames("cards-grid grid gap-3", className)}>{children}</div>;
}

export function InfoCard({ icon: Icon, label, valor, detalhe, className = "" }) {
    return (
        <Card className={classNames("info-card summary-card-fixed h-full", className)}>
            <div className="summary-card-content">
                {Icon && (
                    <div className="summary-card-icon flex shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                        <Icon className="h-4 w-4" />
                    </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                    <p className="summary-card-label texto-quebra-segura">{label}</p>
                    <p className="summary-card-value texto-quebra-segura">{valor}</p>
                    {detalhe && <p className="summary-card-detail">{detalhe}</p>}
                </div>
            </div>
        </Card>
    );
}

export function ResponsiveTable({ children, className = "" }) {
    return <div className={classNames("responsive-table w-full max-w-full overflow-x-auto", className)}>{children}</div>;
}

export function FormGrid({ children, className = "" }) {
    return <div className={classNames("form-grid grid gap-3", className)}>{children}</div>;
}

export function ToolbarResponsive({ children, className = "" }) {
    return <div className={classNames("toolbar-responsive flex flex-wrap items-center justify-end gap-2", className)}>{children}</div>;
}

export function PasswordInput({
    value,
    onChange,
    placeholder = "Digite sua senha",
    onKeyDown,
    autoFocus = false,
    autoComplete = "current-password",
    name,
    id,
    className = "",
    inputClassName = "",
    disabled = false,
}) {
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const IconeVisibilidade = mostrarSenha ? EyeOff : Eye;

    return (
        <div className={classNames("relative", className)}>
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
                id={id}
                name={name}
                type={mostrarSenha ? "text" : "password"}
                value={value}
                onChange={onChange}
                onKeyDown={onKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                autoComplete={autoComplete}
                disabled={disabled}
                className={classNames(
                    "w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-12 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-60",
                    inputClassName
                )}
            />
            <button
                type="button"
                onClick={() => setMostrarSenha((atual) => !atual)}
                disabled={disabled}
                aria-label={mostrarSenha ? "Ocultar senha" : "Visualizar senha"}
                title={mostrarSenha ? "Ocultar senha" : "Visualizar senha"}
                className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
                <IconeVisibilidade className="h-4 w-4" />
            </button>
        </div>
    );
}


