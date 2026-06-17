import React, { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ImagePlus, RotateCcw } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { classNames } from "../../utils/sstUtils";

const BUCKET_LOGO_QR_CODE = "logos-empresas";
const CAMINHO_LOGO_QR_CODE = "configuracoes/qrcode/logo-qrcode.png";
const CHAVE_LOGO_QR_CODE_ANTIGA = "controle-sst-qr:logo-qrcode-personalizado:v1";
const CHAVE_VERSAO_LOGO_QR_CODE = "controle-sst-qr:logo-qrcode-global-versao:v1";
const EVENTO_LOGO_QR_CODE = "controle-sst-qr-logo-qrcode-atualizado";
const TAMANHO_MAXIMO_LOGO_QR_CODE = 350 * 1024;

function montarLogoPadraoQrCode() {
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
            <rect width="96" height="96" rx="24" fill="#0f172a"/>
            <rect x="18" y="18" width="60" height="60" rx="18" fill="#f97316"/>
            <path d="M34 48.5 43.5 58 63 37" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
            <rect x="8" y="8" width="80" height="80" rx="26" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.96"/>
        </svg>
    `.trim();

    try {
        if (typeof window !== "undefined" && typeof window.btoa === "function") {
            return `data:image/svg+xml;base64,${window.btoa(svg)}`;
        }
    } catch {
        // Fallback seguro para navegadores que bloquearem btoa.
    }

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const LOGO_PADRAO_QR_CODE = montarLogoPadraoQrCode();

function obterVersaoLogoQrCodeGlobal() {
    if (typeof window === "undefined") return "";

    try {
        return window.localStorage.getItem(CHAVE_VERSAO_LOGO_QR_CODE) || "";
    } catch {
        return "";
    }
}

function salvarVersaoLogoQrCodeGlobal(versao = "") {
    if (typeof window === "undefined") return;

    try {
        if (versao) {
            window.localStorage.setItem(CHAVE_VERSAO_LOGO_QR_CODE, versao);
        } else {
            window.localStorage.removeItem(CHAVE_VERSAO_LOGO_QR_CODE);
        }

        window.localStorage.removeItem(CHAVE_LOGO_QR_CODE_ANTIGA);
        window.dispatchEvent(new CustomEvent(EVENTO_LOGO_QR_CODE, { detail: { versao } }));
    } catch {
        // Mantém o QR funcional mesmo se o navegador bloquear localStorage.
    }
}

function montarUrlLogoQrCodeGlobal(versao = "") {
    try {
        const { data } = supabase.storage.from(BUCKET_LOGO_QR_CODE).getPublicUrl(CAMINHO_LOGO_QR_CODE);
        const url = data?.publicUrl || "";

        if (!url) return "";

        return versao ? `${url}?v=${encodeURIComponent(String(versao))}` : url;
    } catch {
        return "";
    }
}

function useLogoQrCodeGlobal() {
    const [versaoLogo, setVersaoLogo] = useState(() => obterVersaoLogoQrCodeGlobal());

    useEffect(() => {
        const atualizar = () => setVersaoLogo(obterVersaoLogoQrCodeGlobal());
        const atualizarPorEvento = (evento) => {
            setVersaoLogo(evento?.detail?.versao || obterVersaoLogoQrCodeGlobal());
        };

        window.addEventListener("storage", atualizar);
        window.addEventListener(EVENTO_LOGO_QR_CODE, atualizarPorEvento);

        return () => {
            window.removeEventListener("storage", atualizar);
            window.removeEventListener(EVENTO_LOGO_QR_CODE, atualizarPorEvento);
        };
    }, []);

    return montarUrlLogoQrCodeGlobal(versaoLogo);
}

export function obterLogoQrCodeAtual({ usarPadrao = true } = {}) {
    return montarUrlLogoQrCodeGlobal(obterVersaoLogoQrCodeGlobal()) || (usarPadrao ? LOGO_PADRAO_QR_CODE : "");
}

export function QrCodeComLogo({
    value = "",
    size = 150,
    level = "H",
    includeMargin = true,
    bgColor = "#ffffff",
    fgColor = "#0f172a",
    logoSrc = "",
    logoRatio = 0.24,
    className = "",
}) {
    const logoGlobal = useLogoQrCodeGlobal();
    const logoFinal = logoSrc || logoGlobal || LOGO_PADRAO_QR_CODE;
    const [logoRenderizado, setLogoRenderizado] = useState(logoFinal);
    const tamanhoQr = Math.max(80, Number(size) || 150);
    const proporcaoLogo = Math.min(0.28, Math.max(0.14, Number(logoRatio) || 0.24));
    const tamanhoLogo = Math.round(tamanhoQr * proporcaoLogo);
    const respiroLogo = Math.max(5, Math.round(tamanhoLogo * 0.14));
    const tamanhoFundoLogo = tamanhoLogo + respiroLogo * 2;

    useEffect(() => {
        setLogoRenderizado(logoFinal);
    }, [logoFinal]);

    return (
        <span
            className={classNames("relative inline-flex items-center justify-center overflow-hidden", className)}
            style={{ width: tamanhoQr, height: tamanhoQr }}
        >
            <QRCodeSVG
                value={value || ""}
                size={tamanhoQr}
                level={level || "H"}
                includeMargin={includeMargin}
                bgColor={bgColor}
                fgColor={fgColor}
            />

            {logoRenderizado && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-white"
                    style={{
                        width: tamanhoFundoLogo,
                        height: tamanhoFundoLogo,
                    }}
                >
                    <img
                        src={logoRenderizado}
                        alt=""
                        draggable={false}
                        className="block rounded-lg object-contain"
                        style={{
                            width: tamanhoLogo,
                            height: tamanhoLogo,
                        }}
                        onError={() => {
                            if (logoRenderizado !== LOGO_PADRAO_QR_CODE) {
                                setLogoRenderizado(LOGO_PADRAO_QR_CODE);
                            }
                        }}
                    />
                </span>
            )}
        </span>
    );
}

export function QrCodeLogoControls({ className = "" }) {
    const inputRef = useRef(null);
    const [mensagem, setMensagem] = useState("Logo global do QR Code ativo.");
    const [erro, setErro] = useState(false);
    const [salvando, setSalvando] = useState(false);

    const selecionarLogo = () => {
        if (salvando) return;
        inputRef.current?.click();
    };

    const limparLogo = async () => {
        if (salvando) return;

        setSalvando(true);
        setErro(false);
        setMensagem("Restaurando logo padrão dos QR Codes...");

        try {
            const { error } = await supabase.storage
                .from(BUCKET_LOGO_QR_CODE)
                .remove([CAMINHO_LOGO_QR_CODE]);

            if (error) {
                throw error;
            }

            salvarVersaoLogoQrCodeGlobal(String(Date.now()));
            setMensagem("Logo padrão restaurado em todos os QR Codes.");
            if (inputRef.current) inputRef.current.value = "";
        } catch (error) {
            setErro(true);
            setMensagem(error?.message || "Não foi possível restaurar o logo padrão.");
        } finally {
            setSalvando(false);
        }
    };

    const aoSelecionarArquivo = async (evento) => {
        const arquivo = evento.target.files?.[0];

        if (!arquivo) return;

        if (arquivo.type !== "image/png") {
            setMensagem("Envie apenas imagem PNG para o centro do QR Code.");
            setErro(true);
            evento.target.value = "";
            return;
        }

        if (arquivo.size > TAMANHO_MAXIMO_LOGO_QR_CODE) {
            setMensagem("PNG muito grande. Use uma imagem de até 350 KB.");
            setErro(true);
            evento.target.value = "";
            return;
        }

        setSalvando(true);
        setErro(false);
        setMensagem("Enviando logo global dos QR Codes...");

        try {
            const { error } = await supabase.storage
                .from(BUCKET_LOGO_QR_CODE)
                .upload(CAMINHO_LOGO_QR_CODE, arquivo, {
                    upsert: true,
                    cacheControl: "60",
                    contentType: "image/png",
                });

            if (error) {
                throw error;
            }

            salvarVersaoLogoQrCodeGlobal(String(Date.now()));
            setMensagem("Logo PNG aplicado globalmente nos QR Codes.");
        } catch (error) {
            setErro(true);
            setMensagem(error?.message || "Não foi possível enviar o PNG para o Storage.");
        } finally {
            setSalvando(false);
            evento.target.value = "";
        }
    };

    return (
        <div className={classNames("flex w-full max-w-[260px] flex-col items-center gap-2 text-center", className)}>
            <input
                ref={inputRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={aoSelecionarArquivo}
            />
            <div className="flex w-full flex-col items-stretch gap-2">
                <button
                    type="button"
                    onClick={limparLogo}
                    disabled={salvando}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Usar padrão
                </button>
                <button
                    type="button"
                    onClick={selecionarLogo}
                    disabled={salvando}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-[11px] font-black text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Escolher PNG
                </button>
            </div>
            <p className={classNames("text-[10px] font-bold", erro ? "text-red-600" : "text-slate-500")}>
                {salvando ? "Salvando..." : mensagem}
            </p>
        </div>
    );
}
