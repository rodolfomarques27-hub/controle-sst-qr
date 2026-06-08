import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { FotoColaborador } from "../commonComponents";

export const CRACHA_COLABORADOR_PRINT_STYLES = `
* { box-sizing: border-box; }
body {
  margin: 0;
  background: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
  color: #1a2744;
}
.cracha-print-root {
  --azul: #1a2744;
  --azul-escuro: #09172d;
  --laranja: #e8650a;
  --branco: #ffffff;
  --cinza: #f5f5f5;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 26px;
  padding: 18px;
  background: #ffffff;
}
.cracha-print-side {
  text-align: center;
}
.cracha-print-label {
  margin: 0 0 10px;
  color: var(--laranja);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.cracha-face {
  position: relative;
  width: 300px;
  height: 480px;
  border-radius: 20px;
  overflow: hidden;
  background: var(--branco);
  box-shadow: none;
  border: 1px solid #cfd4dd;
}
.cracha-face::before {
  content: "";
  position: absolute;
  inset: 118px 0 84px 0;
  background:
    linear-gradient(90deg, transparent 0 10%, #000 10% 16%, transparent 16% 24%, #000 24% 30%, transparent 30% 100%),
    linear-gradient(0deg, transparent 0 12%, #000 12% 18%, transparent 18% 28%, #000 28% 34%, transparent 34% 100%);
  background-size: 90px 90px;
  opacity: 0.035;
  z-index: 0;
}
.cracha-furo {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: 70px;
  height: 18px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.35), 0 1px 2px rgba(255,255,255,0.25);
  z-index: 5;
}
.cracha-header {
  position: relative;
  height: 118px;
  background: linear-gradient(135deg, var(--azul-escuro), var(--azul));
  color: #ffffff;
  padding: 24px 14px 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.cracha-header::after {
  content: "";
  position: absolute;
  left: -10px;
  right: -10px;
  bottom: -16px;
  height: 38px;
  background: #ffffff;
  border-top: 5px solid var(--laranja);
  transform: skewY(-5deg);
  transform-origin: left top;
  z-index: -1;
}
.cracha-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.cracha-logo-escudo {
  width: 54px;
  height: 62px;
  flex: 0 0 auto;
}
.cracha-brand-text {
  line-height: 0.9;
  text-align: left;
  font-weight: 900;
  letter-spacing: -1px;
  color: #ffffff;
}
.cracha-brand-text .controle {
  display: block;
  font-size: 25px;
}
.cracha-brand-text .sst,
.cracha-brand-text .qr {
  font-size: 37px;
}
.cracha-brand-text .qr {
  color: var(--laranja);
}
.cracha-divisor-header {
  width: 2px;
  height: 58px;
  background: var(--laranja);
  flex: 0 0 auto;
}
.cracha-logo-empresa-area {
  width: 92px;
  flex: 0 0 auto;
  text-align: center;
}
.cracha-logo-placeholder {
  height: 62px;
  border: 1.8px dashed rgba(255,255,255,0.7);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.85);
  font-size: 10px;
  font-weight: 900;
  line-height: 1.05;
}
.cracha-logo-placeholder .predio {
  font-size: 22px;
  margin-bottom: 2px;
}
.cracha-logo-legenda {
  margin-top: 5px;
  color: #ffffff;
  font-size: 10px;
  text-transform: uppercase;
}
.cracha-content {
  position: relative;
  z-index: 2;
  height: calc(100% - 118px - 84px);
  padding: 26px 18px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.cracha-foto-frame {
  width: 130px;
  height: 130px;
  border: 4px solid var(--laranja);
  border-radius: 50%;
  overflow: hidden;
  background: #e9edf3;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}
.cracha-foto-imagem {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.cracha-nome {
  width: 100%;
  text-align: center;
  font-size: 24px;
  line-height: 1.05;
  font-weight: 950;
  text-transform: uppercase;
  color: var(--azul);
  margin: 2px 0 10px;
}
.cracha-linha-decorativa {
  width: 210px;
  height: 2px;
  background: var(--laranja);
  margin: 0 auto 14px;
  position: relative;
}
.cracha-linha-decorativa::after {
  content: "";
  position: absolute;
  left: 50%;
  top: -1px;
  width: 14px;
  height: 14px;
  border-right: 2px solid var(--laranja);
  border-bottom: 2px solid var(--laranja);
  background: #ffffff;
  transform: translateX(-50%) rotate(45deg);
}
.cracha-dados {
  width: 220px;
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
}
.cracha-linha-dado {
  display: grid;
  grid-template-columns: 34px 1fr;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #cfd4dd;
  padding-bottom: 7px;
}
.cracha-icone-box {
  width: 34px;
  height: 34px;
  border-radius: 7px;
  background: var(--azul);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.cracha-linha-dado p {
  margin: 0;
  font-size: 14px;
  text-align: left;
  color: var(--azul);
}
.cracha-linha-dado strong {
  font-weight: 900;
}
.cracha-valor-dado {
  font-weight: 500;
}
.cracha-cta-frente {
  margin-top: auto;
  margin-bottom: 6px;
  text-align: center;
  color: var(--azul);
  font-size: 14px;
  line-height: 1.15;
  font-weight: 950;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.cracha-chevrons {
  color: var(--laranja);
  font-size: 25px;
  font-weight: 950;
  line-height: 1;
}
.cracha-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 84px;
  background: linear-gradient(135deg, var(--azul-escuro), var(--azul));
  color: #ffffff;
  z-index: 3;
  padding: 10px 10px 8px;
}
.cracha-footer::before {
  content: "";
  position: absolute;
  left: -8px;
  right: -8px;
  top: -18px;
  height: 34px;
  background: inherit;
  border-top: 5px solid var(--laranja);
  transform: skewY(5deg);
  transform-origin: left bottom;
  z-index: -1;
}
.cracha-footer-items {
  display: grid;
  grid-template-columns: 1.25fr 1fr 1fr 1fr;
  align-items: center;
  gap: 4px;
  margin-bottom: 7px;
}
.cracha-footer-item {
  min-width: 0;
  color: #ffffff;
  text-align: center;
  font-size: 9px;
  line-height: 1.1;
  text-transform: uppercase;
  font-weight: 700;
  position: relative;
}
.cracha-footer-item:not(:last-child)::after {
  content: "";
  position: absolute;
  right: -3px;
  top: 9px;
  width: 2px;
  height: 26px;
  background: var(--laranja);
  border-radius: 999px;
}
.cracha-footer-item svg {
  display: block;
  margin: 0 auto 3px;
  width: 25px;
  height: 25px;
}
.cracha-footer-item.primeiro {
  display: grid;
  grid-template-columns: 30px 1fr;
  align-items: center;
  text-align: left;
  gap: 4px;
  font-size: 8.5px;
}
.cracha-final {
  border-top: 1px solid rgba(232,101,10,0.85);
  padding-top: 6px;
  text-align: center;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}
.cracha-verso .cracha-content {
  justify-content: flex-start;
  padding-top: 74px;
}
.cracha-verso-titulo {
  text-align: center;
  color: var(--azul);
  font-weight: 950;
  font-size: 18px;
  line-height: 1.2;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.cracha-verso-seta {
  color: var(--laranja);
  font-size: 34px;
  font-weight: 950;
  line-height: 1;
  margin-bottom: 12px;
}
.cracha-qr-box {
  width: 224px;
  height: 224px;
  border: 3px solid var(--laranja);
  border-radius: 10px;
  background: #ffffff;
  padding: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}
.cracha-qrcode {
  width: 200px;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
}
.cracha-qrcode svg,
.cracha-qrcode canvas,
.cracha-qrcode img {
  display: block !important;
  margin: 0 auto !important;
}
.cracha-texto-legal {
  margin-top: 12px;
  text-align: center;
  font-size: 10.5px;
  line-height: 1.35;
  color: #111827;
  max-width: 250px;
}
.cracha-texto-legal .alerta {
  color: var(--laranja);
  font-weight: 800;
}
@page { size: A4 landscape; margin: 10mm; }
@media print {
  body { background: #ffffff; }
  .cracha-print-root { padding: 0; gap: 16px; }
  .cracha-print-label { display: none; }
  .cracha-face { box-shadow: none; break-inside: avoid; }
}
`;

function LogoControleSstQr() {
    return (
        <div className="cracha-brand">
            <svg className="cracha-logo-escudo" viewBox="0 0 100 115" aria-hidden="true">
                <path d="M50 5 L92 22 V55 C92 82 73 101 50 110 C27 101 8 82 8 55 V22 Z" fill="#e8650a" />
                <path d="M50 13 L83 27 V55 C83 76 69 91 50 99 C31 91 17 76 17 55 V27 Z" fill="#1a2744" />
                <path d="M33 54 h34 v10 h-34z" fill="#fff" />
                <path d="M38 45 c2-13 22-13 24 0 v9 h-24z" fill="#fff" />
                <path d="M30 66 h40 l-8 13 h-24z" fill="#fff" />
                <path d="M38 58 l8 8 18-22" fill="none" stroke="#e8650a" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div className="cracha-brand-text">
                <span className="controle">Controle</span>
                <span className="sst">SST</span><span className="qr">QR</span>
            </div>
        </div>
    );
}

function CrachaHeader() {
    return (
        <header className="cracha-header">
            <LogoControleSstQr />
            <div className="cracha-divisor-header" />
            <div className="cracha-logo-empresa-area">
                <div className="cracha-logo-placeholder">
                    <span className="predio">▮▮▮</span>
                    <span>SUA LOGO<br />AQUI</span>
                </div>
                <div className="cracha-logo-legenda">Logo da empresa</div>
            </div>
        </header>
    );
}

function IconeIdentificacao() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="white" strokeWidth="2" />
            <circle cx="9" cy="11" r="2" fill="white" />
            <path d="M6.5 16c.7-2 4.3-2 5 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M14 10h4M14 14h4" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function IconeCapacete() {
    return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13h14" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M7 13c0-4 2-7 5-7s5 3 5 7" stroke="white" strokeWidth="2" />
            <path d="M9 7v5M15 7v5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M6 17h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function CrachaFooter() {
    return (
        <footer className="cracha-footer">
            <div className="cracha-footer-items">
                <div className="cracha-footer-item primeiro">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 2l8 4v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-4z" stroke="white" strokeWidth="2" />
                        <path d="M8 12l3 3 6-7" stroke="#e8650a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Segurança<br />em cada<br />escolha</span>
                </div>

                <div className="cracha-footer-item">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="8" cy="9" r="3" fill="white" />
                        <circle cx="16" cy="9" r="3" fill="white" />
                        <path d="M4 19c1-4 7-4 8 0M12 19c1-4 7-4 8 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    Pessoas
                </div>

                <div className="cracha-footer-item">
                    <svg viewBox="0 0 24 24" fill="white" aria-hidden="true">
                        <path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.4-2.4 1a7.5 7.5 0 0 0-2.6-1.5L14 2h-4l-.4 2.6A7.5 7.5 0 0 0 7 6.1l-2.4-1-2 3.4 2 1.5A9.6 9.6 0 0 0 4.5 12c0 .5 0 1 .1 1.5l-2 1.5 2 3.4 2.4-1a7.5 7.5 0 0 0 2.6 1.5L10 22h4l.4-2.6a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z" />
                    </svg>
                    Processos
                </div>

                <div className="cracha-footer-item">
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2" />
                        <path d="M8 12l3 3 5-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Proteção
                </div>
            </div>

            <div className="cracha-final">Trabalho seguro, futuro garantido.</div>
        </footer>
    );
}

function FrenteCracha({ colaborador, nome, codigo, funcao }) {
    return (
        <section className="cracha-print-side">
            <h2 className="cracha-print-label">Frente</h2>
            <div className="cracha-face cracha-frente">
                <div className="cracha-furo" />
                <CrachaHeader />

                <section className="cracha-content">
                    <div className="cracha-foto-frame">
                        <FotoColaborador
                            src={colaborador}
                            colaborador={colaborador}
                            colaboradorId={colaborador?.id}
                            nome={nome}
                            className="cracha-foto-imagem"
                            iconClassName="h-10 w-10"
                        />
                    </div>

                    <h1 className="cracha-nome">{nome}</h1>
                    <div className="cracha-linha-decorativa" />

                    <div className="cracha-dados">
                        <div className="cracha-linha-dado">
                            <div className="cracha-icone-box"><IconeIdentificacao /></div>
                            <p><strong>Código:</strong> <span className="cracha-valor-dado">{codigo}</span></p>
                        </div>

                        <div className="cracha-linha-dado">
                            <div className="cracha-icone-box"><IconeCapacete /></div>
                            <p><strong>Função:</strong> <span className="cracha-valor-dado">{funcao}</span></p>
                        </div>
                    </div>

                    <div className="cracha-cta-frente">
                        <span className="cracha-chevrons">»</span>
                        <span>Escaneie para validar<br />e verificar treinamento</span>
                        <span className="cracha-chevrons">«</span>
                    </div>
                </section>

                <CrachaFooter />
            </div>
        </section>
    );
}

function VersoCracha({ valorQr }) {
    return (
        <section className="cracha-print-side">
            <h2 className="cracha-print-label">Verso</h2>
            <div className="cracha-face cracha-verso">
                <div className="cracha-furo" />
                <CrachaHeader />

                <section className="cracha-content">
                    <div className="cracha-verso-titulo">
                        Escaneie para validar<br />
                        e verificar treinamento
                    </div>

                    <div className="cracha-verso-seta">»</div>

                    <div className="cracha-qr-box">
                        <div className="cracha-qrcode">
                            <QRCodeSVG value={valorQr || ""} size={200} level="H" includeMargin bgColor="#ffffff" fgColor="#000000" />
                        </div>
                    </div>

                    <div className="cracha-texto-legal">
                        <strong>Este crachá é pessoal e intransferível.</strong><br />
                        <span className="alerta">O uso indevido é proibido e passível de sanções.</span>
                    </div>
                </section>

                <CrachaFooter />
            </div>
        </section>
    );
}

export function CrachaColaboradorPrint({ colaborador, urlConsultaColaborador }) {
    const nome = String(colaborador?.nome || "Nome do colaborador").trim().toUpperCase();
    const codigo = String(colaborador?.codigoFuncionario || colaborador?.codigo || "COL-ANDE-9DZXM0").trim().toUpperCase();
    const funcao = String(colaborador?.funcao || "Função não informada").trim().toUpperCase();
    const valorQr = urlConsultaColaborador || colaborador?.linkPublico || colaborador?.token || codigo;

    return (
        <div className="cracha-print-root">
            <FrenteCracha colaborador={colaborador} nome={nome} codigo={codigo} funcao={funcao} />
            <VersoCracha valorQr={valorQr} />
        </div>
    );
}
