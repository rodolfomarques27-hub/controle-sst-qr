import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../lib/supabaseClient";
import { useStorageUrl } from "../hooks/useStorageUrl";
import { classNames } from "../utils/sstUtils";

export function FotoColaborador({ src, nome, className = "h-12 w-12", iconClassName = "h-5 w-5" }) {
    const [erroImagem, setErroImagem] = useState(false);
    const url = useStorageUrl("fotos-colaboradores", src, 600);

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
        <div className="flex items-center justify-center rounded-3xl bg-white p-3 shadow-inner ring-1 ring-slate-200">
            <QRCodeSVG
                value={urlConsulta}
                size={size}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#0f172a"
            />
        </div>
    );
}

export function LinkPublicoQR({ token }) {
    const urlConsulta = `${window.location.origin}/?qr=${encodeURIComponent(token)}`;

    return (
        <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 ring-1 ring-slate-200">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-400">Link público</span>
            <span className="max-w-[360px] truncate text-[11px] text-slate-500">{urlConsulta}</span>
        </div>
    );
}

export function Card({ children, className = "" }) {
    return (
        <div className={classNames("rounded-3xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
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

export function Header({ titulo, subtitulo, acao }) {
    return (
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">{titulo}</h1>
                <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
            </div>
            {acao}
        </div>
    );
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
