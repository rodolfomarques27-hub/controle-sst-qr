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


/* ROTEIRO 6 — ETAPA 15
   Ajuste do espaço em branco no mobile e melhoria do card de Armazenamento.
   A identificação do card é feita no AppLayout para não depender de alterar o App.jsx. */
.dashboard-summary-card[data-dashboard-storage-card="true"],
.summary-card-fixed[data-dashboard-storage-card="true"],
.info-card[data-dashboard-storage-card="true"] {
    position: relative;
    padding-bottom: 1.45rem !important;
}

.dashboard-summary-card[data-dashboard-storage-card="true"]::after,
.summary-card-fixed[data-dashboard-storage-card="true"]::after,
.info-card[data-dashboard-storage-card="true"]::after {
    content: "";
    position: absolute;
    left: 1rem;
    right: 1rem;
    bottom: 0.8rem;
    height: 0.42rem;
    border-radius: 999px;
    background: linear-gradient(
        90deg,
        #22c55e 0%,
        #22c55e var(--storage-percent, 0%),
        #e2e8f0 var(--storage-percent, 0%),
        #e2e8f0 100%
    );
    box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.04);
}

.dashboard-summary-card[data-dashboard-storage-level="atencao"]::after,
.summary-card-fixed[data-dashboard-storage-level="atencao"]::after,
.info-card[data-dashboard-storage-level="atencao"]::after {
    background: linear-gradient(
        90deg,
        #f97316 0%,
        #f97316 var(--storage-percent, 0%),
        #ffedd5 var(--storage-percent, 0%),
        #ffedd5 100%
    );
}

.dashboard-summary-card[data-dashboard-storage-level="critico"]::after,
.summary-card-fixed[data-dashboard-storage-level="critico"]::after,
.info-card[data-dashboard-storage-level="critico"]::after {
    background: linear-gradient(
        90deg,
        #ef4444 0%,
        #ef4444 var(--storage-percent, 0%),
        #fee2e2 var(--storage-percent, 0%),
        #fee2e2 100%
    );
}

.dashboard-summary-card[data-dashboard-storage-card="true"] [data-storage-extra-icon="true"],
.summary-card-fixed[data-dashboard-storage-card="true"] [data-storage-extra-icon="true"],
.info-card[data-dashboard-storage-card="true"] [data-storage-extra-icon="true"] {
    display: none !important;
}

.dashboard-summary-card[data-dashboard-storage-card="true"] .summary-card-label,
.summary-card-fixed[data-dashboard-storage-card="true"] .summary-card-label,
.info-card[data-dashboard-storage-card="true"] .summary-card-label,
.dashboard-summary-card[data-dashboard-storage-card="true"] p:first-child,
.summary-card-fixed[data-dashboard-storage-card="true"] p:first-child,
.info-card[data-dashboard-storage-card="true"] p:first-child {
    white-space: nowrap !important;
    word-break: normal !important;
    overflow-wrap: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
    font-size: 0.76rem !important;
    line-height: 1rem !important;
    letter-spacing: -0.02em !important;
}

.dashboard-summary-card[data-dashboard-storage-card="true"] .summary-card-detail,
.summary-card-fixed[data-dashboard-storage-card="true"] .summary-card-detail,
.info-card[data-dashboard-storage-card="true"] .summary-card-detail {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
}

@media (max-width: 767.98px) {
    .page-header {
        justify-content: flex-start !important;
        min-height: 0 !important;
        height: auto !important;
        margin-bottom: 0.55rem !important;
    }

    .page-header-text {
        flex: 0 1 auto !important;
    }

    .page-actions {
        flex: 0 0 auto !important;
        margin-top: 0.18rem !important;
    }

    .page-shell > .page-header + *,
    .app-content > .page-header + *,
    .app-content > div > .page-header + * {
        margin-top: 0 !important;
    }

    .app-main :where(.mb-6) {
        margin-bottom: 0.75rem !important;
    }

    .dashboard-summary-card[data-dashboard-storage-card="true"],
    .summary-card-fixed[data-dashboard-storage-card="true"],
    .info-card[data-dashboard-storage-card="true"] {
        min-height: 7.2rem !important;
        padding-bottom: 1.5rem !important;
    }

    .dashboard-summary-card[data-dashboard-storage-card="true"]::after,
    .summary-card-fixed[data-dashboard-storage-card="true"]::after,
    .info-card[data-dashboard-storage-card="true"]::after {
        left: 0.85rem;
        right: 0.85rem;
        bottom: 0.7rem;
        height: 0.46rem;
    }

    .dashboard-summary-card[data-dashboard-storage-card="true"] .summary-card-label,
    .summary-card-fixed[data-dashboard-storage-card="true"] .summary-card-label,
    .info-card[data-dashboard-storage-card="true"] .summary-card-label,
    .dashboard-summary-card[data-dashboard-storage-card="true"] p:first-child,
    .summary-card-fixed[data-dashboard-storage-card="true"] p:first-child,
    .info-card[data-dashboard-storage-card="true"] p:first-child {
        font-size: 0.78rem !important;
    }
}

/* ROTEIRO 6 — ETAPA 16
   Sidebar fixa no desktop para páginas longas.
   Objetivo: evitar coluna lateral vazia quando o conteúdo é alto e manter a navegação sempre acessível. */
@media (min-width: 1024px) {
    .app-shell {
        display: block !important;
        min-height: 100vh !important;
        width: 100% !important;
        overflow-x: hidden !important;
    }

    .app-sidebar {
        position: fixed !important;
        inset: 0 auto 0 0 !important;
        z-index: 60 !important;
        height: 100dvh !important;
        max-height: 100dvh !important;
        border-right: 1px solid #e2e8f0 !important;
        box-shadow: 10px 0 28px rgba(15, 23, 42, 0.035) !important;
    }

    .app-main {
        width: calc(100% - 5rem) !important;
        min-height: 100vh !important;
        margin-left: 5rem !important;
        transition: margin-left 0.24s ease, width 0.24s ease, padding 0.24s ease !important;
    }

    .app-shell[data-sidebar-open="true"] .app-main {
        width: calc(100% - 18rem) !important;
        margin-left: 18rem !important;
    }

    .app-content,
    .page-shell {
        max-width: min(100%, 1640px) !important;
    }

    .app-sidebar-nav {
        padding-bottom: 0.4rem !important;
    }

    .app-sidebar-user,
    .app-sidebar-user-compact {
        margin-top: 0.85rem !important;
    }
}

@media (min-width: 1024px) and (max-width: 1180px) {
    .app-shell[data-sidebar-open="true"] .app-main {
        width: calc(100% - 16rem) !important;
        margin-left: 16rem !important;
    }
}

@media (max-width: 1023.98px) {
    .app-main {
        width: 100% !important;
        margin-left: 0 !important;
    }
}


/* ROTEIRO 6 — ETAPA 17
   Acabamento da sidebar recolhida: ícones centralizados, alvo visual fixo e logo mais limpo. */
@media (min-width: 1024px) {
    .app-sidebar[data-sidebar-expanded="false"] {
        align-items: center !important;
        padding-left: 0.65rem !important;
        padding-right: 0.65rem !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-brand {
        display: flex !important;
        width: 3.35rem !important;
        height: 3.35rem !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 1.15rem !important;
        background: linear-gradient(145deg, #020617 0%, #0f172a 100%) !important;
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.16), inset 0 0 0 1px rgba(255, 255, 255, 0.06) !important;
    }

    .app-sidebar-brand-icon {
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.10);
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-brand-icon {
        width: 2.45rem !important;
        height: 2.45rem !important;
        border-radius: 0.95rem !important;
        background: rgba(255, 255, 255, 0.08) !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-toggle {
        width: 2.55rem !important;
        height: 2.55rem !important;
        min-height: 2.55rem !important;
        margin-left: auto !important;
        margin-right: auto !important;
        padding: 0 !important;
        border-radius: 1rem !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-nav {
        width: 100% !important;
        display: grid !important;
        justify-items: center !important;
        align-content: start !important;
        gap: 0.42rem !important;
        padding-right: 0 !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-nav-button {
        width: 2.75rem !important;
        height: 2.75rem !important;
        min-width: 2.75rem !important;
        min-height: 2.75rem !important;
        padding: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 1rem !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-nav-button.bg-slate-950 {
        box-shadow: 0 10px 18px rgba(15, 23, 42, 0.16) !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-nav-icon {
        width: 1.02rem !important;
        height: 1.02rem !important;
        margin: 0 !important;
        stroke-width: 2.15 !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-user-compact {
        width: 100% !important;
        margin-top: auto !important;
        display: flex !important;
        justify-content: center !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-user-compact button {
        width: 2.75rem !important;
        height: 2.75rem !important;
        border-radius: 1rem !important;
        font-size: 0.66rem !important;
    }
}


/* ROTEIRO 6 — ETAPA 19
   Correção mobile: fotos padronizadas, QR centralizado, auditoria com melhor leitura e tabelas sem corte visual. */
@media (max-width: 767.98px) {
    .consulta-qr-page,
    .consulta-qr-publica-page {
        width: 100% !important;
        max-width: 100% !important;
        overflow-x: hidden !important;
    }

    .consulta-qr-card,
    .consulta-qr-publica-card {
        width: 100% !important;
        max-width: 100% !important;
        border-radius: 1.45rem !important;
        padding: 0.55rem !important;
    }

    .consulta-qr-card > div,
    .consulta-qr-publica-card > div {
        border-radius: 1.2rem !important;
        padding: 1rem !important;
    }

    .consulta-qr-perfil-grid {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        gap: 1rem !important;
    }

    .consulta-qr-info {
        width: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        text-align: center !important;
    }

    .consulta-qr-info .flex.flex-wrap,
    .consulta-qr-info > .flex,
    .consulta-qr-publica-perfil > .flex {
        justify-content: center !important;
        text-align: center !important;
    }

    .consulta-qr-info h2,
    .consulta-qr-publica-perfil h2 {
        max-width: 100% !important;
        text-align: center !important;
        font-size: 1.55rem !important;
        line-height: 1.1 !important;
    }

    .consulta-qr-info p,
    .consulta-qr-publica-perfil p {
        text-align: center !important;
    }

    .consulta-qr-info a,
    .consulta-qr-info button,
    .consulta-qr-code-area,
    .consulta-qr-code-area > * {
        margin-left: auto !important;
        margin-right: auto !important;
    }

    .consulta-qr-info button {
        width: 100% !important;
        justify-content: center !important;
        min-height: 2.65rem !important;
    }

    .consulta-qr-code-area {
        width: 100% !important;
        justify-content: center !important;
    }

    .consulta-qr-code-area :where(svg, canvas) {
        max-width: min(72vw, 17rem) !important;
        height: auto !important;
    }

    .consulta-qr-card .rounded-3xl.border,
    .consulta-qr-publica-card .rounded-3xl.border {
        text-align: center !important;
    }

    .consulta-qr-card .grid.grid-cols-2,
    .consulta-qr-publica-card .grid.grid-cols-2 {
        grid-template-columns: 1fr !important;
    }

    .responsive-table,
    .dashboard-mobile-table-scroll,
    .app-main :where(.overflow-x-auto) {
        max-width: 100% !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior-x: contain !important;
    }

    .responsive-table table,
    .app-main :where(.overflow-x-auto table) {
        min-width: 46rem !important;
    }

    .dashboard-campo-summary-grid,
    .auditoria-summary-grid,
    .dashboard-auditoria-grid {
        grid-template-columns: 1fr !important;
        gap: 0.82rem !important;
    }

    .dashboard-campo-summary-card,
    .auditoria-summary-card,
    .dashboard-auditoria-card {
        min-height: 7.4rem !important;
        border-radius: 1.35rem !important;
        padding: 1rem !important;
    }

    .dashboard-campo-summary-card :where(p, span, div),
    .auditoria-summary-card :where(p, span, div),
    .dashboard-auditoria-card :where(p, span, div) {
        overflow-wrap: anywhere !important;
    }

    .colaboradores-section-destaque .group .flex.items-start.gap-4 {
        align-items: center !important;
    }

    .colaboradores-section-destaque .group .h-20.w-20,
    .colaboradores-section-destaque .group img.h-20.w-20 {
        width: 4.75rem !important;
        height: 4.75rem !important;
    }
}



/* ROTEIRO 6 — ETAPA 20
   Correção final do ícone cortado na sidebar recolhida.
   O ajuste deixa a coluna recolhida com centro óptico fixo, remove recortes do botão ativo
   e simplifica o logo superior para não parecer um quadrado dentro de outro. */
@media (min-width: 1024px) {
    .app-sidebar[data-sidebar-expanded="false"] {
        width: 5rem !important;
        min-width: 5rem !important;
        max-width: 5rem !important;
        padding: 0.72rem 0.55rem !important;
        align-items: center !important;
        overflow: visible !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-brand,
    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-toggle,
    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-nav,
    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-user-compact {
        width: 100% !important;
        max-width: 100% !important;
        margin-left: auto !important;
        margin-right: auto !important;
        justify-items: center !important;
        justify-content: center !important;
        align-items: center !important;
        text-align: center !important;
        box-sizing: border-box !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-brand {
        width: 2.95rem !important;
        height: 2.95rem !important;
        min-width: 2.95rem !important;
        min-height: 2.95rem !important;
        padding: 0 !important;
        border-radius: 1rem !important;
        background: #020617 !important;
        overflow: visible !important;
        box-shadow: 0 10px 22px rgba(15, 23, 42, 0.18), inset 0 0 0 1px rgba(255, 255, 255, 0.08) !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-brand-icon {
        width: 2.95rem !important;
        height: 2.95rem !important;
        min-width: 2.95rem !important;
        min-height: 2.95rem !important;
        border-radius: 1rem !important;
        background: transparent !important;
        color: #ffffff !important;
        box-shadow: none !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-brand-icon svg {
        width: 1.22rem !important;
        height: 1.22rem !important;
        display: block !important;
        margin: 0 !important;
        overflow: visible !important;
        stroke-width: 2.25 !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-toggle {
        width: 2.55rem !important;
        height: 2.55rem !important;
        min-width: 2.55rem !important;
        min-height: 2.55rem !important;
        padding: 0 !important;
        border-radius: 0.95rem !important;
        overflow: visible !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-toggle span {
        display: inline-flex !important;
        width: 1rem !important;
        height: 1rem !important;
        align-items: center !important;
        justify-content: center !important;
        line-height: 1 !important;
        transform: translateY(-0.02rem) !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-nav {
        display: grid !important;
        grid-template-columns: 1fr !important;
        gap: 0.46rem !important;
        padding: 0 !important;
        overflow: visible !important;
        scrollbar-width: none !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-nav-button {
        display: inline-flex !important;
        width: 2.55rem !important;
        height: 2.55rem !important;
        min-width: 2.55rem !important;
        min-height: 2.55rem !important;
        max-width: 2.55rem !important;
        max-height: 2.55rem !important;
        margin: 0 auto !important;
        padding: 0 !important;
        align-items: center !important;
        justify-content: center !important;
        justify-self: center !important;
        border-radius: 0.95rem !important;
        overflow: visible !important;
        box-sizing: border-box !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-nav-button.bg-slate-950 {
        background: #020617 !important;
        box-shadow: 0 9px 18px rgba(15, 23, 42, 0.15) !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-nav-icon {
        display: block !important;
        width: 1.05rem !important;
        height: 1.05rem !important;
        min-width: 1.05rem !important;
        min-height: 1.05rem !important;
        margin: 0 !important;
        overflow: visible !important;
        stroke-width: 2.25 !important;
        transform: none !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-user-compact {
        margin-top: auto !important;
        padding: 0 !important;
        overflow: visible !important;
    }

    .app-sidebar[data-sidebar-expanded="false"] .app-sidebar-user-compact button {
        width: 2.55rem !important;
        height: 2.55rem !important;
        min-width: 2.55rem !important;
        min-height: 2.55rem !important;
        padding: 0 !important;
        border-radius: 0.95rem !important;
        font-size: 0.62rem !important;
        overflow: visible !important;
    }
}

`;
