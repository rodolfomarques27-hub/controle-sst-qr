import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ImagePlus, RotateCcw } from "lucide-react";
import { classNames } from "../../utils/sstUtils";

const CHAVE_LOGO_QR_CODE = "controle-sst-qr:logo-qrcode-personalizado:v1";
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
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const LOGO_PADRAO_QR_CODE = montarLogoPadraoQrCode();

function lerLogoQrCodeSalvo() {
    if (typeof window === "undefined") return "";

    try {
        return window.localStorage.getItem(CHAVE_LOGO_QR_CODE) || "";
    } catch {
        return "";
    }
}

function salvarLogoQrCodePersonalizado(dataUrl = "") {
    if (typeof window === "undefined") return;

    try {
        if (dataUrl) {
            window.localStorage.setItem(CHAVE_LOGO_QR_CODE, dataUrl);
        } else {
            window.localStorage.removeItem(CHAVE_LOGO_QR_CODE);
        }

        window.dispatchEvent(new CustomEvent(EVENTO_LOGO_QR_CODE, { detail: { logo: dataUrl } }));
    } catch {
        // Mantém o QR funcional mesmo se o navegador bloquear localStorage.
    }
}

function useLogoQrCodePersonalizado() {
    const [logoPersonalizado, setLogoPersonalizado] = useState(() => lerLogoQrCodeSalvo());

    useEffect(() => {
        const atualizar = () => setLogoPersonalizado(lerLogoQrCodeSalvo());
        const atualizarPorEvento = (evento) => {
            setLogoPersonalizado(evento?.detail?.logo ?? lerLogoQrCodeSalvo());
        };

        window.addEventListener("storage", atualizar);
        window.addEventListener(EVENTO_LOGO_QR_CODE, atualizarPorEvento);

        return () => {
            window.removeEventListener("storage", atualizar);
            window.removeEventListener(EVENTO_LOGO_QR_CODE, atualizarPorEvento);
        };
    }, []);

    return logoPersonalizado;
}

export function obterLogoQrCodeAtual({ usarPadrao = true } = {}) {
    return lerLogoQrCodeSalvo() || (usarPadrao ? LOGO_PADRAO_QR_CODE : "");
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
    const logoPersonalizado = useLogoQrCodePersonalizado();
    const logoFinal = logoSrc || logoPersonalizado || LOGO_PADRAO_QR_CODE;
    const tamanhoQr = Math.max(80, Number(size) || 150);
    const proporcaoLogo = Math.min(0.28, Math.max(0.14, Number(logoRatio) || 0.24));
    const tamanhoLogo = Math.round(tamanhoQr * proporcaoLogo);
    const respiroLogo = Math.max(5, Math.round(tamanhoLogo * 0.14));
    const tamanhoFundoLogo = tamanhoLogo + respiroLogo * 2;

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

            {logoFinal && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-white"
                    style={{
                        width: tamanhoFundoLogo,
                        height: tamanhoFundoLogo,
                    }}
                >
                    <img
                        src={logoFinal}
                        alt=""
                        draggable={false}
                        className="block rounded-lg object-contain"
                        style={{
                            width: tamanhoLogo,
                            height: tamanhoLogo,
                        }}
                    />
                </span>
            )}
        </span>
    );
}

export function QrCodeLogoControls({ className = "" }) {
    const inputRef = useRef(null);
    const logoPersonalizado = useLogoQrCodePersonalizado();
    const [mensagem, setMensagem] = useState(logoPersonalizado ? "Logo PNG personalizado ativo." : "Logo padrão ativo.");
    const [erro, setErro] = useState(false);

    useEffect(() => {
        setMensagem(logoPersonalizado ? "Logo PNG personalizado ativo." : "Logo padrão ativo.");
        setErro(false);
    }, [logoPersonalizado]);

    const selecionarLogo = () => {
        inputRef.current?.click();
    };

    const limparLogo = () => {
        salvarLogoQrCodePersonalizado("");
        setMensagem("Logo padrão ativo.");
        setErro(false);
        if (inputRef.current) inputRef.current.value = "";
    };

    const aoSelecionarArquivo = (evento) => {
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

        const leitor = new FileReader();

        leitor.onload = () => {
            const resultado = String(leitor.result || "");
            salvarLogoQrCodePersonalizado(resultado);
            setMensagem("Logo PNG aplicado em todos os QR Codes deste navegador.");
            setErro(false);
        };

        leitor.onerror = () => {
            setMensagem("Não foi possível carregar o PNG selecionado.");
            setErro(true);
        };

        leitor.readAsDataURL(arquivo);
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
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[11px] font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Usar padrão
                </button>
                <button
                    type="button"
                    onClick={selecionarLogo}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-[11px] font-black text-white hover:bg-slate-800"
                >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Escolher PNG
                </button>
            </div>
            <p className={classNames("text-[10px] font-bold", erro ? "text-red-600" : "text-slate-500")}>
                {mensagem}
            </p>
        </div>
    );
}



