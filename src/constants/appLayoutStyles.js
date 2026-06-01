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




/* ROTEIRO 6 — ETAPA 14
   Correção fina do mobile e sidebar:
   - remove travamento/efeito pesado do cabeçalho sticky no celular;
   - compacta o cabeçalho mobile;
   - deixa os cards do dashboard com altura menor no celular;
   - impede o card de armazenamento de estourar;
   - melhora o scroll interno da lateral;
   - prepara a lateral para abrir temporariamente por aproximação/hover. */
.app-sidebar {
    position: sticky;
    top: 0;
    height: 100vh;
    max-height: 100vh;
    overflow: hidden !important;
}

.app-sidebar-brand,
.app-sidebar-toggle,
.app-sidebar-user,
.app-sidebar-user-compact {
    flex: 0 0 auto;
}

.app-sidebar-nav {
    flex: 1 1 auto;
    min-height: 0;
    overflow-x: hidden;
    overflow-y: auto;
    padding-right: 0.15rem;
    scrollbar-width: none;
}

.app-sidebar-nav::-webkit-scrollbar {
    width: 0;
    height: 0;
}

.app-sidebar:hover .app-sidebar-nav {
    scrollbar-width: thin;
}

.app-sidebar:hover .app-sidebar-nav::-webkit-scrollbar {
    width: 5px;
}

.app-sidebar-user {
    overflow: hidden;
}

.app-sidebar-user p {
    max-width: 100%;
}

.dashboard-summary-card,
.summary-card-fixed,
.config-summary-card,
.auditoria-summary-card,
.dashboard-campo-summary-card {
    min-width: 0 !important;
    overflow: hidden !important;
}

.dashboard-summary-card *,
.summary-card-fixed *,
.config-summary-card *,
.auditoria-summary-card *,
.dashboard-campo-summary-card * {
    min-width: 0;
}

.dashboard-summary-card :where(p, span, strong, div),
.summary-card-fixed :where(p, span, strong, div),
.config-summary-card :where(p, span, strong, div),
.auditoria-summary-card :where(p, span, strong, div),
.dashboard-campo-summary-card :where(p, span, strong, div) {
    overflow-wrap: anywhere;
}

.dashboard-summary-card .summary-card-value,
.dashboard-summary-card p:nth-child(2),
.summary-card-fixed .summary-card-value {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
}

@media (max-width: 767.98px) {
    html,
    body,
    #root {
        overflow-x: hidden !important;
        overflow-y: auto !important;
        height: auto !important;
        min-height: 100% !important;
        touch-action: pan-y !important;
        -webkit-overflow-scrolling: touch;
    }

    body {
        overscroll-behavior-y: auto !important;
    }

    .app-shell,
    .app-main,
    .app-content,
    .page-shell {
        overflow-x: hidden !important;
        overflow-y: visible !important;
        min-height: 0 !important;
    }

    .app-main {
        padding: 0.72rem 0.72rem calc(1.1rem + env(safe-area-inset-bottom)) !important;
    }

    .app-mobile-header {
        position: relative !important;
        top: auto !important;
        z-index: 5 !important;
        display: grid !important;
        gap: 0.52rem !important;
        margin-bottom: 0.72rem !important;
        border-radius: 1.18rem !important;
        padding: 0.62rem !important;
        box-shadow: 0 8px 20px rgba(15, 23, 42, 0.07) !important;
        backdrop-filter: none !important;
    }

    .app-mobile-header__topo {
        gap: 0.48rem !important;
    }

    .app-mobile-header__marca {
        gap: 0.52rem !important;
    }

    .app-mobile-header__logo {
        width: 2.15rem !important;
        height: 2.15rem !important;
        border-radius: 0.82rem !important;
    }

    .app-mobile-header__nome {
        font-size: 0.86rem !important;
        line-height: 1.05 !important;
    }

    .app-mobile-header__usuario {
        max-width: 11rem !important;
        font-size: 0.64rem !important;
        line-height: 0.9rem !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    .app-mobile-header__sair {
        min-height: 2.05rem !important;
        padding: 0.45rem 0.62rem !important;
        font-size: 0.68rem !important;
    }

    .app-mobile-header__navegacao,
    .app-mobile-header__tela-atual {
        display: none !important;
    }

    .app-mobile-header__select {
        display: block !important;
        min-height: 2.38rem !important;
        border-radius: 0.9rem !important;
        padding: 0.5rem 0.68rem !important;
        font-size: 0.9rem !important;
        font-weight: 850 !important;
        line-height: 1.1rem !important;
    }

    .page-header {
        margin-bottom: 0.55rem !important;
        gap: 0.45rem !important;
    }

    .page-header-text h1 {
        font-size: 1.18rem !important;
    }

    .page-header-text p {
        font-size: 0.74rem !important;
        line-height: 1.18rem !important;
    }

    .page-actions,
    .page-actions > *,
    .page-actions > .flex,
    .page-actions > .top-actions-nowrap,
    .top-actions-nowrap,
    .toolbar-responsive {
        gap: 0.42rem !important;
        margin-top: 0 !important;
    }

    .page-actions button,
    .top-actions-nowrap button,
    .toolbar-responsive button {
        min-height: 2.38rem !important;
        border-radius: 0.9rem !important;
        padding: 0.58rem 0.74rem !important;
        font-size: 0.78rem !important;
    }

    .dashboard-summary-grid {
        grid-template-columns: 1fr !important;
        gap: 0.62rem !important;
    }

    .dashboard-summary-card,
    .summary-card-fixed,
    .config-summary-card,
    .auditoria-summary-card,
    .dashboard-campo-summary-card {
        height: auto !important;
        min-height: 7.4rem !important;
        max-height: none !important;
        border-radius: 1.2rem !important;
        padding: 0.85rem !important;
    }

    .dashboard-summary-card > div,
    .summary-card-fixed .summary-card-content,
    .config-summary-card .summary-card-content,
    .auditoria-summary-card .summary-card-content,
    .dashboard-campo-summary-card .summary-card-content {
        min-height: 0 !important;
        height: auto !important;
    }

    .summary-card-fixed .summary-card-label,
    .config-summary-card .summary-card-label,
    .auditoria-summary-card .summary-card-label,
    .dashboard-campo-summary-card .summary-card-label {
        min-height: 0 !important;
        max-height: none !important;
        font-size: 0.78rem !important;
        line-height: 1.05rem !important;
    }

    .summary-card-fixed .summary-card-value,
    .config-summary-card .summary-card-value,
    .auditoria-summary-card .summary-card-value,
    .dashboard-campo-summary-card .summary-card-value,
    .dashboard-summary-card p:nth-child(2) {
        font-size: 1.35rem !important;
        line-height: 1.1 !important;
        max-height: none !important;
    }

    .summary-card-fixed .summary-card-detail,
    .config-summary-card .summary-card-detail,
    .auditoria-summary-card .summary-card-detail,
    .dashboard-campo-summary-card .summary-card-detail {
        font-size: 0.72rem !important;
        line-height: 1rem !important;
    }

    .dashboard-summary-card :where(svg, .summary-card-icon),
    .summary-card-fixed .summary-card-icon,
    .config-summary-card .summary-card-icon,
    .auditoria-summary-card .summary-card-icon,
    .dashboard-campo-summary-card .summary-card-icon {
        width: 2.15rem !important;
        height: 2.15rem !important;
        flex-basis: 2.15rem !important;
    }

    .responsive-table {
        max-width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
    }
}

@media (max-width: 380px) {
    .app-mobile-header__usuario {
        max-width: 8.2rem !important;
    }

    .app-mobile-header__sair span {
        display: none !important;
    }
}

`;
