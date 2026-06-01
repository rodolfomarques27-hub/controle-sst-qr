import { estilosGlobais as estilosGlobaisBase } from "./sstConstants";

export const estilosGlobais = `
${estilosGlobaisBase}

/* Ajuste complementar do Dashboard SST
   Mantém o layout global original e garante que o Filtro 1 consiga alterar
   o tamanho das cartas principais mesmo quando o CSS global do grid define
   regras próprias para .dashboard-summary-card. */
.dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="padrao"] {
    grid-column: span 1 / span 1 !important;
}

@media (max-width: 639.98px) {
    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="padrao"],
    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="medio"],
    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="grande"],
    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="destaque"] {
        grid-column: span 1 / span 1 !important;
    }
}

@media (min-width: 640px) {
    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="medio"] {
        grid-column: span 2 / span 2 !important;
    }

    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="grande"] {
        grid-column: span 2 / span 2 !important;
    }

    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="destaque"] {
        grid-column: span 2 / span 2 !important;
    }
}

@media (min-width: 1024px) {
    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="grande"] {
        grid-column: span 3 / span 3 !important;
    }

    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="destaque"] {
        grid-column: span 4 / span 4 !important;
    }
}

@media (min-width: 1280px) {
    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="padrao"] {
        grid-column: span 1 / span 1 !important;
    }

    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="medio"] {
        grid-column: span 2 / span 2 !important;
    }

    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="grande"] {
        grid-column: span 3 / span 3 !important;
    }

    .dashboard-summary-grid > .dashboard-summary-card[data-dashboard-card-tamanho="destaque"] {
        grid-column: span 5 / span 5 !important;
    }
}


/* ROTEIRO 6 — ETAPA 13
   Padrão visual mobile separado do desktop.
   Desktop permanece com sidebar e grids largos. Celular vira experiência de campo:
   cabeçalho próprio, cards em uma coluna, botões grandes e menos risco de estouro horizontal. */
@media (max-width: 767.98px) {
    html,
    body,
    #root {
        width: 100%;
        min-width: 0;
        min-height: 100%;
        overflow-x: hidden;
        background: #f1f5f9;
    }

    body {
        overscroll-behavior-y: contain;
    }

    .app-shell {
        display: block !important;
        width: 100% !important;
        min-height: 100dvh !important;
        overflow-x: hidden !important;
    }

    .app-main {
        width: 100% !important;
        min-width: 0 !important;
        min-height: 100dvh !important;
        padding: 0.62rem 0.62rem calc(1rem + env(safe-area-inset-bottom)) !important;
        overflow-x: hidden !important;
    }

    .app-content,
    .page-shell {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        margin-inline: 0 !important;
    }

    .app-mobile-header {
        position: sticky;
        top: 0.52rem;
        z-index: 40;
        display: grid;
        gap: 0.68rem;
        margin-bottom: 0.78rem !important;
        border: 1px solid #dbe7f2;
        border-radius: 1.35rem;
        background: rgba(255, 255, 255, 0.96);
        padding: 0.72rem;
        box-shadow: 0 14px 34px rgba(15, 23, 42, 0.10);
        backdrop-filter: blur(14px);
    }

    .app-mobile-header__topo {
        display: flex;
        min-width: 0;
        align-items: center;
        justify-content: space-between;
        gap: 0.65rem;
    }

    .app-mobile-header__marca {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.65rem;
    }

    .app-mobile-header__logo,
    .app-mobile-header__tela-icone {
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 1rem;
        background: #020617;
        color: #ffffff;
    }

    .app-mobile-header__logo {
        width: 2.45rem;
        height: 2.45rem;
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.18);
    }

    .app-mobile-header__nome {
        margin: 0;
        color: #020617;
        font-size: 0.95rem;
        font-weight: 950;
        line-height: 1.1;
    }

    .app-mobile-header__usuario {
        margin: 0.16rem 0 0;
        max-width: 12rem;
        overflow: hidden;
        color: #64748b;
        font-size: 0.68rem;
        font-weight: 750;
        line-height: 1;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .app-mobile-header__sair {
        display: inline-flex;
        min-height: 2.25rem;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        gap: 0.34rem;
        border-radius: 999px;
        background: #f8fafc;
        padding: 0.55rem 0.72rem;
        color: #334155;
        font-size: 0.72rem;
        font-weight: 900;
        box-shadow: inset 0 0 0 1px #dbe7f2;
    }

    .app-mobile-header__navegacao {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.55rem;
        min-width: 0;
    }

    .app-mobile-header__tela-atual {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.58rem;
        border-radius: 1.05rem;
        background: #f8fafc;
        padding: 0.58rem 0.62rem;
        box-shadow: inset 0 0 0 1px #e2e8f0;
    }

    .app-mobile-header__tela-icone {
        width: 2.1rem;
        height: 2.1rem;
        border-radius: 0.85rem;
        background: #dbeafe;
        color: #1d4ed8;
    }

    .app-mobile-header__tela-atual span {
        display: block;
        color: #64748b;
        font-size: 0.62rem;
        font-weight: 900;
        letter-spacing: 0.06em;
        line-height: 1;
        text-transform: uppercase;
    }

    .app-mobile-header__tela-atual strong {
        display: block;
        margin-top: 0.16rem;
        overflow: hidden;
        color: #020617;
        font-size: 0.86rem;
        font-weight: 950;
        line-height: 1.08;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .app-mobile-header__select {
        width: 100%;
        min-height: 2.65rem;
        border: 1px solid #cbd5e1;
        border-radius: 1rem;
        background: #ffffff;
        padding: 0.65rem 0.78rem;
        color: #0f172a;
        font-size: 1rem;
        font-weight: 850;
        outline: none;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.05);
    }

    .page-header {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 0.62rem !important;
        margin-bottom: 0.72rem !important;
    }

    .page-header-text,
    .page-header-text p {
        width: 100% !important;
        max-width: 100% !important;
    }

    .page-header-text h1 {
        font-size: 1.32rem !important;
        line-height: 1.15 !important;
    }

    .page-header-text p {
        font-size: 0.78rem !important;
        line-height: 1.28rem !important;
    }

    .page-actions,
    .page-actions > *,
    .page-actions > .flex,
    .page-actions > .top-actions-nowrap,
    .top-actions-nowrap,
    .toolbar-responsive {
        width: 100% !important;
        max-width: 100% !important;
        flex-wrap: wrap !important;
        justify-content: stretch !important;
        gap: 0.5rem !important;
    }

    .page-actions button,
    .top-actions-nowrap button,
    .toolbar-responsive button {
        flex: 1 1 100% !important;
        width: 100% !important;
        min-height: 2.75rem !important;
        justify-content: center !important;
        border-radius: 1rem !important;
        font-size: 0.86rem !important;
        line-height: 1.1rem !important;
    }

    .cards-grid,
    .cards-grid--summary,
    .cards-grid--compact,
    .config-sections-grid,
    .config-inner-grid,
    .form-grid,
    .dashboard-summary-grid,
    .dashboard-auditoria-grid,
    .cards-grid--fixed-5,
    .summary-grid-fixed-5,
    .config-summary-grid,
    .auditoria-summary-grid,
    .dashboard-campo-summary-grid,
    .colaboradores-status-grid,
    .treinamentos-personalizacao-grid,
    .treinamentos-size-grid,
    .empresas-base-grid-3,
    .empresas-filtros-grid,
    .empresa-doc-tipos-grid,
    .empresa-doc-campos-datas,
    .empresa-form-linha--2,
    .empresa-form-linha--3,
    .empresa-form-bloco-auditoria__grid,
    .novo-colaborador-row-anterior-3,
    .novo-colaborador-row-anterior-2,
    .novo-colaborador-linha-3,
    .novo-colaborador-linha-2 {
        grid-template-columns: 1fr !important;
    }

    .treinamentos-layout-grid {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 0.72rem !important;
    }

    .treinamentos-layout-card,
    .treinamentos-layout-card--compacto,
    .treinamentos-layout-card--medio,
    .treinamentos-layout-card--largo,
    .treinamentos-layout-card--full {
        grid-column: 1 / -1 !important;
        width: 100% !important;
        min-width: 0 !important;
    }

    .treinamentos-personalizacao-dashboard,
    .empresas-cadastro-unificado .empresas-cadastro-grid,
    .empresa-base-card__conteudo,
    .empresas-form-panel--documento .empresa-form-grid--documento,
    .empresa-doc-tipo-card--grande,
    .empresas-form-panel--documento .empresa-doc-tipos-grid--vertical > .empresa-doc-tipo-card--grande {
        grid-template-columns: 1fr !important;
    }

    .empresa-base-card__acoes,
    .empresa-base-card__acoes :where(button, span) {
        width: 100% !important;
    }

    .empresa-base-card__acoes {
        display: grid !important;
        grid-template-columns: 1fr !important;
    }

    .empresa-base-card__acoes :where(button, span) {
        min-height: 2.35rem !important;
        justify-content: center !important;
        font-size: 0.78rem !important;
    }

    .empresas-cadastro-header,
    .novo-colaborador-cabecalho-branco,
    .treinamentos-personalizacao-dashboard > .min-w-0:first-child {
        flex-direction: column !important;
        align-items: stretch !important;
    }

    .empresas-cadastro-header__acao,
    .novo-colaborador-cabecalho-branco__acao {
        width: 100% !important;
    }

    .responsive-table {
        border-radius: 1rem;
        background: #ffffff;
        box-shadow: inset 0 0 0 1px #e2e8f0;
    }

    .responsive-table table {
        min-width: 42rem !important;
    }

    .app-main :where(input, select, textarea) {
        font-size: 1rem !important;
    }

    .app-main :where(.rounded-3xl, .rounded-2xl) {
        max-width: 100%;
    }
}

@media (max-width: 380px) {
    .app-main {
        padding-inline: 0.48rem !important;
    }

    .app-mobile-header {
        border-radius: 1.15rem;
        padding: 0.6rem;
    }

    .app-mobile-header__nome {
        font-size: 0.88rem;
    }

    .app-mobile-header__usuario {
        max-width: 9.4rem;
    }

    .app-mobile-header__sair span {
        display: none;
    }
}

`;
