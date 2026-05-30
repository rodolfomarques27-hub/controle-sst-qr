// Constantes e listas fixas do sistema SST.
// Este arquivo foi separado do App.jsx para reduzir acoplamento e facilitar manutenção.

export const TAMANHO_PAGINA_SUPABASE = 1000;

export const estilosGlobais = `
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    min-height: 100%;
    width: 100%;
  }

  body {
    overflow-x: hidden;
  }

  img,
  video,
  canvas,
  svg {
    max-width: 100%;
  }

  input,
  select,
  textarea,
  button {
    max-width: 100%;
  }

  .app-shell {
    width: 100%;
    overflow-x: hidden;
  }

  .app-sidebar {
    flex: 0 0 auto;
    max-height: 100vh;
    overflow-y: auto;
  }

  .app-main {
    min-width: 0;
    width: 100%;
    flex: 1 1 auto;
    overflow-x: hidden;
    padding: clamp(1rem, 1.4vw + 0.5rem, 2rem);
  }

  .app-content,
  .page-shell {
    width: 100%;
    max-width: min(100%, 1600px);
    margin-inline: auto;
  }

  .page-header {
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .page-header-text {
    flex: 1 1 18rem;
    min-width: 0;
    max-width: 34rem;
  }

  .page-header-text h1 {
    line-height: 1.15;
  }

  .page-header-text p {
    max-width: 34rem;
  }

  .page-actions {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.45rem;
    min-width: 0;
    max-width: none;
  }

  .page-actions > *,
  .page-actions > .flex,
  .page-actions > .top-actions-nowrap,
  .top-actions-nowrap {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.45rem;
    min-width: 0;
    max-width: none;
  }

  .page-actions button,
  .top-actions-nowrap button {
    min-height: 2.5rem;
    white-space: nowrap;
    padding: 0.6rem 0.85rem;
    font-size: 0.78rem;
    line-height: 1.05rem;
  }

  .page-actions svg,
  .top-actions-nowrap svg {
    width: 0.95rem;
    height: 0.95rem;
  }

  .toolbar-responsive {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
    min-width: 0;
  }

  .cards-grid {
    display: grid;
    gap: clamp(0.75rem, 1vw, 1rem);
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
    align-items: stretch;
  }

  .cards-grid--summary {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 15.5rem), 1fr));
  }

  .cards-grid--compact {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
  }

  .config-sections-grid {
    display: grid;
    gap: clamp(1rem, 1.2vw, 1.5rem);
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 40rem), 1fr));
    align-items: start;
  }

  .config-inner-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
  }

  .form-grid {
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  }

  .responsive-table {
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }

  .responsive-table table {
    width: 100%;
    min-width: 720px;
  }

  .texto-quebra-segura {
    min-width: 0;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .sem-estouro-horizontal {
    min-width: 0;
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  .dashboard-summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 12.75rem), 1fr));
    gap: 0.75rem;
    align-items: stretch;
  }

  .dashboard-summary-grid > * {
    grid-column: auto !important;
    min-width: 0;
  }

  .dashboard-summary-card {
    display: flex;
    min-height: 9.5rem;
    height: 100%;
  }

  .dashboard-summary-card > div {
    width: 100%;
  }

  .dashboard-auditoria-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 12.5rem), 1fr));
    gap: 0.75rem;
    align-items: stretch;
  }

  .dashboard-auditoria-card {
    min-height: 8.5rem;
    height: 100%;
  }



  /* DEFINIÇÃO FINAL DE GRID DE INDICADORES
     Padrão aprovado: 5 cards por linha em desktop/notebook largo,
     todos com mesma largura, mesma altura mínima e texto reduzido/controlado.
     Usar em Configurações, Auditoria do sistema e Dashboard Auditoria de Campo. */
  .cards-grid--fixed-5,
  .summary-grid-fixed-5,
  .config-summary-grid,
  .auditoria-summary-grid,
  .dashboard-campo-summary-grid {
    display: grid !important;
    width: 100%;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    gap: clamp(0.65rem, 0.8vw, 0.9rem) !important;
    align-items: stretch !important;
  }

  .cards-grid--fixed-5 > *,
  .summary-grid-fixed-5 > *,
  .config-summary-grid > *,
  .auditoria-summary-grid > *,
  .dashboard-campo-summary-grid > * {
    min-width: 0 !important;
    width: 100% !important;
    height: 100% !important;
    min-height: 9.6rem !important;
  }

  .summary-card-fixed,
  .config-summary-card,
  .auditoria-summary-card,
  .dashboard-campo-summary-card {
    height: 100% !important;
    min-height: 9.6rem !important;
    padding: 1rem !important;
    overflow: hidden;
  }

  .summary-card-fixed .summary-card-content,
  .config-summary-card .summary-card-content,
  .auditoria-summary-card .summary-card-content,
  .dashboard-campo-summary-card .summary-card-content {
    min-height: 7.2rem;
    height: 100%;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .summary-card-fixed .summary-card-icon,
  .config-summary-card .summary-card-icon,
  .auditoria-summary-card .summary-card-icon,
  .dashboard-campo-summary-card .summary-card-icon {
    width: 2.45rem;
    height: 2.45rem;
    flex: 0 0 2.45rem;
  }

  .summary-card-fixed .summary-card-label,
  .config-summary-card .summary-card-label,
  .auditoria-summary-card .summary-card-label,
  .dashboard-campo-summary-card .summary-card-label {
    min-height: 2.2rem;
    font-size: 0.76rem;
    line-height: 1.05rem;
    font-weight: 900;
    color: #020617;
    overflow-wrap: anywhere;
  }

  .summary-card-fixed .summary-card-value,
  .config-summary-card .summary-card-value,
  .auditoria-summary-card .summary-card-value,
  .dashboard-campo-summary-card .summary-card-value {
    margin-top: 0.45rem;
    font-size: clamp(1.25rem, 1.4vw, 1.65rem);
    line-height: 1.05;
    font-weight: 900;
    color: #020617;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .summary-card-fixed .summary-card-detail,
  .config-summary-card .summary-card-detail,
  .auditoria-summary-card .summary-card-detail,
  .dashboard-campo-summary-card .summary-card-detail {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #f1f5f9;
    font-size: 0.68rem;
    line-height: 0.98rem;
    font-weight: 600;
    color: #475569;
    overflow-wrap: anywhere;
  }

  /* Compatibilidade com grids antigos que voltavam para 6 colunas. */
  .dashboard-auditoria-grid {
    display: grid !important;
    grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
    gap: clamp(0.65rem, 0.8vw, 0.9rem) !important;
    align-items: stretch !important;
  }

  .dashboard-auditoria-grid > * {
    min-width: 0 !important;
    width: 100% !important;
    height: 100% !important;
  }

  .dashboard-auditoria-card {
    min-height: 9.6rem !important;
    height: 100% !important;
    padding: 1rem !important;
  }

  .dashboard-auditoria-card p:first-child,
  .dashboard-auditoria-card .summary-card-label {
    font-size: 0.76rem !important;
    line-height: 1.05rem !important;
    font-weight: 900 !important;
  }

  .dashboard-auditoria-card p:nth-child(2),
  .dashboard-auditoria-card .summary-card-value {
    font-size: clamp(1.25rem, 1.4vw, 1.65rem) !important;
    line-height: 1.05 !important;
  }

  .header-aniversariantes .page-header-text {
    max-width: 45rem;
  }

  .header-aniversariantes .page-header-text p {
    max-width: 45rem;
    text-align: justify;
    text-wrap: pretty;
  }

  @media (max-width: 1180px) {
    .cards-grid--fixed-5,
    .summary-grid-fixed-5,
    .config-summary-grid,
    .auditoria-summary-grid,
    .dashboard-campo-summary-grid,
    .dashboard-auditoria-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 920px) {
    .cards-grid--fixed-5,
    .summary-grid-fixed-5,
    .config-summary-grid,
    .auditoria-summary-grid,
    .dashboard-campo-summary-grid,
    .dashboard-auditoria-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }
  }

  @media (max-width: 640px) {
    .cards-grid--fixed-5,
    .summary-grid-fixed-5,
    .config-summary-grid,
    .auditoria-summary-grid,
    .dashboard-campo-summary-grid,
    .dashboard-auditoria-grid {
      grid-template-columns: 1fr !important;
    }

    .header-aniversariantes .page-header-text p {
      text-align: left;
    }
  }


  /* Ajuste definitivo para manter os cards de resumo com altura igual entre todas as linhas. */
  .summary-card-fixed,
  .config-summary-card,
  .auditoria-summary-card,
  .dashboard-campo-summary-card {
    height: 9.9rem !important;
    min-height: 9.9rem !important;
    max-height: 9.9rem !important;
  }

  .summary-card-fixed .summary-card-content,
  .config-summary-card .summary-card-content,
  .auditoria-summary-card .summary-card-content,
  .dashboard-campo-summary-card .summary-card-content {
    min-height: 0 !important;
    height: 100% !important;
    overflow: hidden;
  }

  .summary-card-fixed .summary-card-label,
  .config-summary-card .summary-card-label,
  .auditoria-summary-card .summary-card-label,
  .dashboard-campo-summary-card .summary-card-label {
    min-height: 2rem !important;
    max-height: 2rem !important;
    overflow: hidden;
  }

  .summary-card-fixed .summary-card-value,
  .config-summary-card .summary-card-value,
  .auditoria-summary-card .summary-card-value,
  .dashboard-campo-summary-card .summary-card-value {
    max-height: 3.2rem;
    overflow: hidden;
  }

  .summary-card-value--token {
    font-size: clamp(0.58rem, 0.62vw, 0.72rem) !important;
    line-height: 0.78rem !important;
    letter-spacing: -0.045em;
    max-height: 2.45rem !important;
    overflow: hidden !important;
  }

  .colaboradores-section-destaque,
  .colaboradores-info-card,
  .colaborador-formulario-full {
    width: 100%;
    min-width: 0;
  }

  .colaborador-formulario-full > :not(.colaborador-form-toggle) {
    width: 100%;
  }

  .colaborador-formulario-unificado {
    position: relative;
  }

  .colaborador-form-toggle {
    position: absolute;
    top: 1.1rem;
    right: 1.1rem;
    z-index: 8;
    width: auto !important;
    max-width: max-content;
    white-space: nowrap;
  }

  .colaborador-formulario-unificado :where(form, .form-grid, .formulario-grid, .cadastro-grid) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.85rem;
    align-items: start;
  }

  .colaborador-formulario-unificado :where(textarea, .campo-linha-inteira, .treinamentos-funcao, .upload-area) {
    grid-column: 1 / -1;
  }

  .colaborador-formulario-unificado :where(input, select, textarea) {
    min-width: 0;
  }

  .colaborador-formulario-recolhido {
    min-height: 7rem;
  }


  .colaborador-formulario-unificado :where(.space-y-3, .space-y-4):has(input),
  .colaborador-formulario-unificado :where(.space-y-3, .space-y-4):has(select) {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem !important;
  }

  .colaborador-formulario-unificado :where(.space-y-3, .space-y-4):has(input) > *,
  .colaborador-formulario-unificado :where(.space-y-3, .space-y-4):has(select) > * {
    margin-top: 0 !important;
    min-width: 0;
  }

  .colaborador-formulario-unificado :where(.space-y-3, .space-y-4):has(input) > :where(.rounded-3xl, .rounded-2xl, textarea, label, button),
  .colaborador-formulario-unificado :where(.space-y-3, .space-y-4):has(select) > :where(.rounded-3xl, .rounded-2xl, textarea, label, button) {
    grid-column: 1 / -1;
  }

  .empresas-section-destaque,
  .empresas-info-card,
  .empresas-cadastro-grid {
    width: 100%;
    min-width: 0;
  }

  .empresas-cadastro-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    gap: clamp(1rem, 1.2vw, 1.5rem);
    align-items: start;
  }

  .empresas-cadastro-grid > * {
    min-width: 0;
    height: 100%;
  }

  .empresas-cadastro-unificado {
    overflow: hidden;
  }

  .empresas-cadastro-unificado .empresas-cadastro-grid {
    margin-top: 1.1rem;
  }

  .empresa-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    align-items: start;
  }

  .empresa-form-grid :where(input, select, textarea) {
    min-width: 0;
  }

  .empresa-form-grid > :where(.rounded-3xl, .rounded-2xl, textarea, label, button),
  .empresa-form-grid > .grid {
    grid-column: 1 / -1;
  }

  .empresa-form-grid > input,
  .empresa-form-grid > select,
  .empresa-form-grid > div:has(> input[type="date"]) {
    grid-column: span 1;
  }

  .empresas-form-panel {
    height: 100%;
  }

  .empresas-form-panel .-m-5 {
    margin: -1.25rem -1.25rem 1.25rem -1.25rem;
  }

  .treinamentos-layout-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: clamp(0.85rem, 1vw, 1.25rem);
    align-items: start;
  }

  .treinamentos-layout-card {
    min-width: 0;
  }

  .treinamentos-layout-card--compacto {
    grid-column: span 4;
  }

  .treinamentos-layout-card--medio {
    grid-column: span 6;
  }

  .treinamentos-layout-card--largo {
    grid-column: span 8;
  }

  .treinamentos-layout-card--full {
    grid-column: 1 / -1;
  }

  .treinamentos-layout-card > * {
    width: 100%;
  }

  .treinamentos-personalizacao-grid--layout {
    align-items: stretch;
  }

  .treinamentos-personalizacao-dashboard {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    gap: 1rem;
    align-items: start;
  }

  .treinamentos-personalizacao-lista {
    display: grid;
    gap: 0.7rem;
  }

  .treinamentos-personalizacao-item {
    border: 1px solid #bfdbfe;
    background: rgba(255, 255, 255, 0.78);
    border-radius: 1.25rem;
    padding: 0.8rem;
  }

  .treinamentos-personalizacao-item-topo {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.7rem;
  }

  .treinamentos-size-grid {
    margin-top: 0.7rem;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .treinamentos-size-option {
    min-height: 3.05rem;
    border-radius: 0.9rem;
    border: 1px solid #e2e8f0;
    background: white;
    padding: 0.45rem 0.35rem;
    text-align: center;
    font-size: 0.72rem;
    line-height: 0.95rem;
    font-weight: 900;
    color: #334155;
  }

  .treinamentos-size-option span {
    display: block;
    margin-top: 0.05rem;
    font-size: 0.58rem;
    line-height: 0.75rem;
    font-weight: 800;
    color: #64748b;
  }

  .treinamentos-size-option.is-active {
    border-color: #020617;
    background: #020617;
    color: white;
  }

  .treinamentos-size-option.is-active span {
    color: #dbeafe;
  }

  .colaboradores-status-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.65rem;
    align-items: stretch;
  }

  .colaborador-status-card {
    min-width: 0;
    min-height: 5.7rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
  }

  .colaborador-status-card p:first-child {
    min-height: 1.85rem;
    font-size: 0.68rem;
    line-height: 0.9rem;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .colaborador-status-card p:last-child {
    margin-top: 0.15rem;
    font-size: 1.55rem;
    line-height: 1.7rem;
    font-weight: 900;
  }

  .treinamentos-personalizacao-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.75rem;
    min-width: min(100%, 38rem);
  }

  @media (max-width: 1280px) {
    .colaboradores-status-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .empresas-cadastro-grid {
      grid-template-columns: 1fr;
    }

    .treinamentos-personalizacao-dashboard {
      grid-template-columns: 1fr;
    }

    .treinamentos-layout-card--compacto,
    .treinamentos-layout-card--medio,
    .treinamentos-layout-card--largo {
      grid-column: span 6;
    }

    .treinamentos-personalizacao-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      min-width: 0;
      width: 100%;
    }
  }

  @media (max-width: 640px) {
    .colaboradores-status-grid,
    .treinamentos-personalizacao-grid,
    .treinamentos-size-grid,
    .empresa-form-grid,
    .colaborador-formulario-unificado :where(form, .form-grid, .formulario-grid, .cadastro-grid) {
      grid-template-columns: 1fr;
    }

    .colaborador-form-toggle {
      position: static;
      width: 100% !important;
      max-width: none;
      margin-bottom: 0.75rem;
    }

    .treinamentos-layout-card--compacto,
    .treinamentos-layout-card--medio,
    .treinamentos-layout-card--largo,
    .treinamentos-layout-card--full {
      grid-column: 1 / -1;
    }
  }



  /* ETAPA 8 — acabamento final de harmonia dos formulários e personalização.
     Objetivo: eliminar espaços vazios, manter campos em linhas equilibradas e permitir arrastar cards. */
  .colaborador-formulario-unificado {
    overflow: hidden;
  }

  .colaborador-formulario-unificado .colaborador-form-toggle {
    top: 1rem;
    right: 1rem;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) {
    width: 100%;
    min-width: 0;
  }

  .colaborador-formulario-unificado :where(.space-y-3, .space-y-4):has(input),
  .colaborador-formulario-unificado :where(.space-y-3, .space-y-4):has(select) {
    display: block !important;
  }

  .colaborador-formulario-unificado :where(.space-y-3, .space-y-4):has(input) > *,
  .colaborador-formulario-unificado :where(.space-y-3, .space-y-4):has(select) > * {
    margin-top: 0 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem !important;
    align-items: start;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > *,
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > * {
    min-width: 0;
  }

  .colaborador-formulario-unificado :where(input, select, textarea) {
    min-height: 2.72rem;
    padding-top: 0.65rem;
    padding-bottom: 0.65rem;
  }

  .colaborador-formulario-unificado :where(label) {
    margin-bottom: 0.35rem;
  }

  .colaborador-formulario-unificado :where(p) {
    line-height: 1.25rem;
  }

  .colaborador-formulario-unificado :where(.rounded-3xl.bg-slate-50, .rounded-2xl.bg-slate-50, .border-dashed, textarea, button.w-full, .treinamentos-funcao, .upload-area) {
    grid-column: 1 / -1;
  }

  .colaborador-formulario-unificado :where(.grid, .flex):has(input[type="checkbox"]) {
    align-items: end;
  }

  .empresas-cadastro-unificado {
    padding: 1rem !important;
  }

  .empresas-cadastro-unificado > .flex:first-child {
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.85rem;
  }

  .empresas-cadastro-unificado .empresas-cadastro-grid {
    margin-top: 0.85rem !important;
  }

  .empresas-cadastro-grid {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
    gap: 0.9rem !important;
    align-items: start !important;
  }

  .empresas-cadastro-grid > *,
  .empresas-form-panel {
    height: auto !important;
    min-height: 0 !important;
    align-self: start !important;
  }

  .empresas-form-panel {
    padding: 1rem !important;
  }

  .empresas-form-panel .-m-5 {
    margin: -1rem -1rem 0.85rem -1rem !important;
    padding: 1rem !important;
  }

  .empresas-form-panel h2 {
    font-size: 1rem;
    line-height: 1.25rem;
  }

  .empresas-form-panel p {
    line-height: 1.25rem;
  }

  .empresa-form-grid {
    gap: 0.55rem !important;
  }

  .empresa-form-grid :where(input, select, textarea) {
    min-height: 2.45rem;
    padding-top: 0.55rem;
    padding-bottom: 0.55rem;
  }

  .empresa-form-grid :where(textarea) {
    min-height: 4rem;
  }

  .empresa-form-grid :where(.rounded-3xl.bg-emerald-50\/60, .rounded-2xl.bg-slate-50) {
    padding: 0.75rem !important;
  }

  .empresa-form-grid--documento .rounded-2xl.bg-slate-50 p {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .treinamentos-personalizacao-dashboard {
    grid-template-columns: 1fr !important;
    gap: 0.85rem !important;
  }

  .treinamentos-personalizacao-dashboard > .min-w-0:first-child {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid #bfdbfe;
    padding-bottom: 0.85rem;
  }

  .treinamentos-personalizacao-dashboard > .min-w-0:first-child > div:first-child,
  .treinamentos-personalizacao-dashboard > .min-w-0:first-child > p,
  .treinamentos-personalizacao-dashboard > .min-w-0:first-child > h2 {
    min-width: 0;
  }

  .treinamentos-personalizacao-lista {
    display: grid;
    gap: 0.6rem !important;
  }

  .treinamentos-personalizacao-item {
    padding: 0.7rem !important;
    transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
  }

  .treinamentos-personalizacao-item.is-dragging {
    opacity: 0.58;
    transform: scale(0.995);
    box-shadow: 0 14px 30px rgba(15, 23, 42, 0.12);
  }

  .treinamentos-personalizacao-item.is-drop-target {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
  }

  .treinamentos-drag-handle {
    cursor: grab;
    touch-action: none;
  }

  .treinamentos-drag-handle:active {
    cursor: grabbing;
  }

  .treinamentos-size-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 0.4rem !important;
  }

  .treinamentos-size-option {
    min-height: 2.72rem !important;
  }

  @media (max-width: 1280px) {
    .empresas-cadastro-grid {
      grid-template-columns: 1fr !important;
    }
  }

  @media (max-width: 920px) {
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .treinamentos-personalizacao-dashboard > .min-w-0:first-child {
      display: block;
    }
  }

  @media (max-width: 640px) {
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select),
    .treinamentos-size-grid {
      grid-template-columns: 1fr !important;
    }
  }


  .scrollbar-discreta {
    scrollbar-width: thin;
    scrollbar-color: #e2e8f0 transparent;
    scrollbar-gutter: stable;
  }

  .scrollbar-discreta::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  .scrollbar-discreta::-webkit-scrollbar-track {
    background: transparent;
    margin: 18px 0;
  }

  .scrollbar-discreta::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 999px;
  }

  .scrollbar-discreta::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }

  @media (max-width: 1280px) {
    .page-header {
      gap: 0.6rem;
    }

    .page-header-text {
      flex-basis: 16rem;
      max-width: 30rem;
    }

    .page-header-text h1 {
      font-size: 1.35rem;
    }

    .page-header-text p {
      font-size: 0.78rem;
      line-height: 1.35rem;
      max-width: 29rem;
    }

    .page-actions,
    .page-actions > *,
    .page-actions > .flex,
    .page-actions > .top-actions-nowrap,
    .top-actions-nowrap {
      gap: 0.4rem;
    }

    .page-actions button,
    .top-actions-nowrap button {
      min-height: 2.35rem;
      padding: 0.55rem 0.72rem;
      font-size: 0.72rem;
      line-height: 0.98rem;
    }
  }

  @media (max-width: 1023px) {
    .app-main {
      padding: 1rem;
    }

    .page-header {
      flex-direction: column;
      align-items: stretch;
    }

    .page-header-text {
      min-width: 0;
      max-width: 100%;
    }

    .page-header-text p {
      max-width: 100%;
    }

    .page-actions,
    .page-actions > *,
    .page-actions > .flex,
    .page-actions > .top-actions-nowrap,
    .top-actions-nowrap,
    .toolbar-responsive {
      flex-wrap: wrap;
      justify-content: flex-start;
      width: 100%;
      max-width: 100%;
    }
  }


  /* ETAPA 9 — formulário do novo colaborador largo, sem buracos visuais, e estados recolhidos persistidos no navegador. */
  .colaborador-formulario-unificado {
    overflow: hidden;
  }

  .colaborador-formulario-unificado .colaborador-form-toggle {
    top: 1rem !important;
    right: 1rem !important;
    height: 2.45rem !important;
    padding-inline: 1rem !important;
    border-radius: 999px !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) {
    width: 100%;
    min-width: 0;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) {
    display: grid !important;
    grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
    column-gap: clamp(0.8rem, 1vw, 1rem) !important;
    row-gap: 0.72rem !important;
    align-items: start !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > *,
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > * {
    min-width: 0 !important;
    margin-top: 0 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(1),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(1) {
    grid-column: 1 / span 4 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(2),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(2) {
    grid-column: 5 / span 4 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(3),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(3) {
    grid-column: 9 / span 4 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(4),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(4) {
    grid-column: 1 / span 3 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(5),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(5) {
    grid-column: 4 / span 2 !important;
    align-self: end !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(6),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(6) {
    grid-column: 6 / span 4 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(7),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(7) {
    grid-column: 10 / span 3 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(n+8),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(n+8),
  .colaborador-formulario-unificado :where(.border-dashed, .upload-area, .treinamentos-funcao, textarea, button.w-full) {
    grid-column: 1 / -1 !important;
  }

  .colaborador-formulario-unificado :where(label) {
    display: block;
    margin-bottom: 0.28rem !important;
    font-size: 0.72rem !important;
    line-height: 1rem !important;
  }

  .colaborador-formulario-unificado :where(input, select, textarea) {
    min-height: 2.6rem !important;
    padding-top: 0.58rem !important;
    padding-bottom: 0.58rem !important;
  }

  .colaborador-formulario-unificado :where(p) {
    margin-top: 0.32rem !important;
    font-size: 0.72rem !important;
    line-height: 1rem !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(3) p,
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(3) p,
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(7) p,
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(7) p {
    max-height: 1rem !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    white-space: nowrap !important;
  }

  .colaborador-formulario-unificado :where(.grid, .flex):has(input[type="checkbox"]),
  .colaborador-formulario-unificado :where(label):has(input[type="checkbox"]) {
    min-height: 2.6rem !important;
    align-items: center !important;
  }

  .colaborador-formulario-unificado :where(.border-dashed, .upload-area) {
    min-height: 3rem !important;
    padding-block: 0.8rem !important;
  }

  @media (max-width: 1180px) {
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) {
      grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
    }

    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(1),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(1),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(2),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(2),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(3),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(3),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(4),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(4),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(5),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(5),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(6),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(6),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(7),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(7) {
      grid-column: span 3 !important;
    }
  }

  @media (max-width: 640px) {
    .app-main {
      padding: 0.75rem;
    }

    .cards-grid,
    .cards-grid--summary,
    .cards-grid--compact,
    .config-sections-grid,
    .config-inner-grid,
    .form-grid,
    .dashboard-summary-grid,
    .dashboard-auditoria-grid {
      grid-template-columns: 1fr;
    }

    .page-actions > *,
    .toolbar-responsive > * {
      flex: 1 1 auto;
    }
  }

  /* ETAPA 10 — Novo colaborador em 3 linhas: Nome/Data/Empresa, Situação/Matrícula/Função, Documentos/Foto. */
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) {
    grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
    column-gap: clamp(0.75rem, 1vw, 1rem) !important;
    row-gap: 0.72rem !important;
    align-items: start !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > *,
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > * {
    min-height: auto !important;
  }

  /* Linha 1: Nome completo / Data de nascimento / Empresa terceirizada */
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(1),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(1) {
    order: 1 !important;
    grid-column: 1 / span 4 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(4),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(4) {
    order: 2 !important;
    grid-column: 5 / span 4 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(2),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(2) {
    order: 3 !important;
    grid-column: 9 / span 4 !important;
  }

  /* Linha 2: Situação na obra / Matrícula da empresa / Função */
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(3),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(3) {
    order: 4 !important;
    grid-column: 1 / span 4 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(7),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(7) {
    order: 5 !important;
    grid-column: 5 / span 4 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(6),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(6) {
    order: 6 !important;
    grid-column: 9 / span 4 !important;
  }

  /* Remove da tela o check "Mostrar em aniversariantes" mantendo o valor salvo no estado do formulário. */
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(5),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(5) {
    display: none !important;
  }

  /* Linha 3: subir documentos / adicionar foto */
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(8),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(8) {
    order: 7 !important;
    grid-column: 1 / span 6 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(9),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(9) {
    order: 8 !important;
    grid-column: 7 / span 6 !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(n+10),
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(n+10) {
    order: 9 !important;
    grid-column: 1 / -1 !important;
  }

  .colaborador-formulario-unificado :where(input, select, textarea) {
    min-height: 2.55rem !important;
  }

  .colaborador-formulario-unificado :where(.border-dashed, .upload-area) {
    min-height: 3.05rem !important;
    padding-block: 0.75rem !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
  }

  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(3) p,
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(3) p,
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(7) p,
  .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(7) p {
    max-height: 2rem !important;
    overflow: hidden !important;
    display: -webkit-box !important;
    -webkit-line-clamp: 2 !important;
    -webkit-box-orient: vertical !important;
    white-space: normal !important;
    text-align: center !important;
    line-height: 1rem !important;
  }

  @media (max-width: 1180px) {
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(1),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(1),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(2),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(2),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(3),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(3),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(4),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(4),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(6),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(6),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(7),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(7),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(8),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(8),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > :nth-child(9),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > :nth-child(9) {
      grid-column: span 3 !important;
    }
  }

  @media (max-width: 820px) {
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input),
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) {
      grid-template-columns: 1fr !important;
    }

    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(input) > *,
    .colaborador-formulario-unificado > :not(.colaborador-form-toggle) > :where(.space-y-3, .space-y-4):has(select) > * {
      grid-column: 1 / -1 !important;
    }
  }



  /* ETAPA 11 — layout final do Novo colaborador em 4 linhas fixas e sem checkbox de aniversariante. */
  .novo-colaborador-layout-final {
    display: grid;
    gap: 1rem;
    padding: 1rem 1.15rem 1.25rem;
  }

  .novo-colaborador-linha {
    display: grid;
    gap: 1rem;
    align-items: start;
  }

  .novo-colaborador-linha-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .novo-colaborador-linha-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .novo-colaborador-campo {
    min-width: 0;
  }

  .novo-colaborador-label {
    display: block;
    margin-bottom: 0.35rem;
    color: #475569;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    line-height: 1.1;
    text-transform: uppercase;
  }

  .novo-colaborador-input {
    width: 100%;
    min-height: 2.75rem;
    border: 1px solid #dbe3ef;
    border-radius: 1.05rem;
    background: #ffffff;
    padding: 0.72rem 0.95rem;
    color: #0f172a;
    font-size: 0.88rem;
    font-weight: 650;
    outline: none;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .novo-colaborador-input:focus {
    border-color: #93c5fd;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.10);
  }

  .novo-colaborador-ajuda {
    margin-top: 0.42rem;
    color: #7182a4;
    font-size: 0.73rem;
    font-weight: 650;
    line-height: 1.35;
    text-align: center;
  }

  .novo-colaborador-ajuda-2linhas {
    display: -webkit-box;
    max-height: 2.05rem;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .novo-colaborador-uploads {
    align-items: stretch;
  }

  .novo-colaborador-upload-card {
    min-width: 0;
    border: 1px dashed #b8cdf0;
    border-radius: 1.2rem;
    background: linear-gradient(180deg, #f8fbff, #ffffff);
    padding: 0.7rem;
  }

  .novo-colaborador-upload-label {
    display: flex;
    min-height: 4.15rem;
    cursor: pointer;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    border-radius: 1rem;
    padding: 0.7rem 0.85rem;
    color: #1e3a8a;
    transition: background 0.18s ease, color 0.18s ease;
  }

  .novo-colaborador-upload-label:hover {
    background: #eff6ff;
    color: #0f172a;
  }

  .novo-colaborador-upload-label strong {
    display: block;
    overflow: hidden;
    color: inherit;
    font-size: 0.9rem;
    font-weight: 950;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .novo-colaborador-upload-label small {
    display: block;
    margin-top: 0.2rem;
    overflow: hidden;
    color: #64748b;
    font-size: 0.72rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .novo-colaborador-upload-icone {
    display: inline-flex;
    height: 2.35rem;
    width: 2.35rem;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border-radius: 0.9rem;
    background: #dbeafe;
    color: #1d4ed8;
  }

  .novo-colaborador-upload-status {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem;
    border-top: 1px solid #e2e8f0;
    padding: 0.6rem 0.4rem 0 0.4rem;
    color: #475569;
    font-size: 0.72rem;
    font-weight: 800;
  }

  .novo-colaborador-upload-status button {
    display: inline-flex;
    height: 1.8rem;
    width: 1.8rem;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #ffffff;
    color: #64748b;
    box-shadow: inset 0 0 0 1px #e2e8f0;
  }

  .novo-colaborador-botao-cadastrar {
    display: inline-flex;
    width: 100%;
    min-height: 3.25rem;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    border-radius: 1.2rem;
    background: #020617;
    color: #ffffff;
    font-size: 0.95rem;
    font-weight: 950;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
    transition: transform 0.16s ease, background 0.16s ease;
  }

  .novo-colaborador-botao-cadastrar:hover {
    background: #0f172a;
    transform: translateY(-1px);
  }

  @media (max-width: 1180px) {
    .novo-colaborador-linha-3 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .novo-colaborador-linha-3,
    .novo-colaborador-linha-2 {
      grid-template-columns: 1fr;
    }
  }

  /* ETAPA 12 — Novo colaborador no visual anterior, mantendo a disposição final em 4 linhas. */
  .novo-colaborador-layout-anterior {
    display: grid;
    gap: 1rem;
    background: #ffffff;
    padding: 1.35rem 1.45rem 1.45rem;
  }

  .novo-colaborador-row-anterior {
    display: grid;
    gap: 1rem;
    align-items: start;
  }

  .novo-colaborador-row-anterior-3 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .novo-colaborador-row-anterior-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .novo-colaborador-campo-anterior {
    min-width: 0;
  }

  .novo-colaborador-label-anterior {
    display: block;
    margin-bottom: 0.42rem;
    color: #475569;
    font-size: 0.74rem;
    font-weight: 900;
    letter-spacing: 0.04em;
    line-height: 1.1;
    text-transform: uppercase;
  }

  .novo-colaborador-input-anterior {
    width: 100%;
    min-height: 2.75rem;
    border: 1px solid #d8e2ee;
    border-radius: 1.1rem;
    background: #ffffff;
    padding: 0.72rem 1rem;
    color: #0f172a;
    font-size: 0.9rem;
    font-weight: 650;
    outline: none;
    transition: border-color 0.18s ease, box-shadow 0.18s ease;
  }

  .novo-colaborador-input-anterior:focus {
    border-color: #93c5fd;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.10);
  }

  .novo-colaborador-ajuda-anterior {
    display: -webkit-box;
    max-height: 2rem;
    margin: 0.45rem auto 0;
    overflow: hidden;
    color: #7182a4;
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1rem;
    text-align: center;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .novo-colaborador-uploads-anterior {
    align-items: stretch;
  }

  .novo-colaborador-upload-card-anterior {
    min-width: 0;
    border: 1px dashed #b8cdf0;
    border-radius: 1.15rem;
    background: #f8fbff;
    padding: 0.65rem;
  }

  .novo-colaborador-upload-label-anterior {
    display: flex;
    min-height: 3.65rem;
    cursor: pointer;
    align-items: center;
    justify-content: space-between;
    gap: 0.85rem;
    border-radius: 0.95rem;
    background: #ffffff;
    padding: 0.68rem 0.85rem;
    color: #1d4ed8;
    box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.45);
    transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  }

  .novo-colaborador-upload-label-anterior:hover {
    background: #eff6ff;
    color: #0f172a;
    box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.45);
  }

  .novo-colaborador-upload-label-anterior strong {
    display: block;
    overflow: hidden;
    color: inherit;
    font-size: 0.86rem;
    font-weight: 950;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .novo-colaborador-upload-label-anterior small {
    display: block;
    margin-top: 0.18rem;
    overflow: hidden;
    color: #64748b;
    font-size: 0.7rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .novo-colaborador-upload-status-anterior {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem;
    padding: 0.55rem 0.35rem 0;
    color: #475569;
    font-size: 0.72rem;
    font-weight: 800;
  }

  .novo-colaborador-upload-status-anterior button {
    display: inline-flex;
    height: 1.7rem;
    width: 1.7rem;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: #ffffff;
    color: #64748b;
    box-shadow: inset 0 0 0 1px #e2e8f0;
  }

  .novo-colaborador-botao-cadastrar-anterior {
    display: inline-flex;
    width: 100%;
    min-height: 3rem;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    border-radius: 1.1rem;
    background: #020617;
    color: #ffffff;
    font-size: 0.94rem;
    font-weight: 950;
    box-shadow: 0 10px 24px rgba(15, 23, 42, 0.14);
    transition: transform 0.16s ease, background 0.16s ease;
  }

  .novo-colaborador-botao-cadastrar-anterior:hover {
    background: #0f172a;
    transform: translateY(-1px);
  }

  @media (max-width: 1180px) {
    .novo-colaborador-row-anterior-3 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 760px) {
    .novo-colaborador-row-anterior-3,
    .novo-colaborador-row-anterior-2 {
      grid-template-columns: 1fr;
    }
  }

  /* ETAPA 13 — cabeçalho do novo colaborador dentro do cartão branco, no padrão do site. */
  .colaborador-formulario-unificado {
    background: #ffffff;
    border: 1px solid #dbe5f0;
    border-radius: 1.75rem;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
  }

  .novo-colaborador-cabecalho-branco {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.1rem 1.25rem 1rem;
    border-bottom: 1px solid #e7eef6;
    background: #ffffff;
  }

  .novo-colaborador-cabecalho-branco__info {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.9rem;
  }

  .novo-colaborador-cabecalho-branco__icone {
    display: inline-flex;
    height: 3rem;
    width: 3rem;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border-radius: 1rem;
    background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%);
    color: #1d4ed8;
    box-shadow: inset 0 0 0 1px rgba(147, 197, 253, 0.5);
  }

  .novo-colaborador-cabecalho-branco__etiqueta {
    margin: 0;
    color: #2563eb;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.08em;
    line-height: 1.1;
    text-transform: uppercase;
  }

  .novo-colaborador-cabecalho-branco__titulo {
    margin: 0.2rem 0 0;
    color: #020617;
    font-size: 1.28rem;
    font-weight: 950;
    line-height: 1.15;
  }

  .novo-colaborador-cabecalho-branco__subtitulo {
    margin: 0.24rem 0 0;
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 600;
    line-height: 1.4;
  }

  .novo-colaborador-cabecalho-branco__acao {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    flex: 0 0 auto;
    min-height: 2.55rem;
    padding: 0.7rem 1rem;
    border-radius: 999px;
    background: #ffffff;
    color: #334155;
    font-size: 0.78rem;
    font-weight: 900;
    box-shadow: inset 0 0 0 1px #d7e1ec;
  }

  .novo-colaborador-cabecalho-branco__acao:hover {
    background: #f8fafc;
  }

  .colaborador-formulario-unificado .colaborador-form-toggle {
    position: static !important;
    top: auto !important;
    right: auto !important;
    height: auto !important;
    padding-inline: 1rem !important;
  }

  @media (max-width: 860px) {
    .novo-colaborador-cabecalho-branco {
      flex-direction: column;
      align-items: stretch;
    }

    .novo-colaborador-cabecalho-branco__acao {
      width: 100%;
    }
  }

  /* ETAPA 14 — informação dinâmica da situação na obra e documentos aceitos centralizados. */
  .novo-colaborador-ajuda-anterior {
    min-height: 2rem;
  }

  .novo-colaborador-upload-label-anterior {
    min-height: 4.15rem;
  }

  .novo-colaborador-upload-info-anterior {
    display: flex;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .novo-colaborador-upload-info-anterior strong,
  .novo-colaborador-upload-info-anterior small {
    max-width: 100%;
    text-align: center;
  }

  .novo-colaborador-upload-label-documentos {
    min-height: 4.9rem;
  }

  .novo-colaborador-upload-tipos-anterior {
    display: -webkit-box !important;
    margin-top: 0.2rem !important;
    max-width: 36rem !important;
    overflow: hidden !important;
    color: #2563eb !important;
    font-size: 0.68rem !important;
    font-weight: 800 !important;
    line-height: 0.92rem !important;
    white-space: normal !important;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }


  /* ETAPA 15 — cards de upload com a mesma altura visual. */
  .novo-colaborador-uploads-anterior {
    align-items: stretch !important;
  }

  .novo-colaborador-uploads-anterior .novo-colaborador-upload-card-anterior {
    display: flex !important;
    min-height: 6.45rem !important;
    height: 100% !important;
    flex-direction: column !important;
  }

  .novo-colaborador-uploads-anterior .novo-colaborador-upload-label-anterior,
  .novo-colaborador-uploads-anterior .novo-colaborador-upload-label-documentos {
    flex: 1 1 auto !important;
    min-height: 4.9rem !important;
  }

`;

export const DAY = 1000 * 60 * 60 * 24;
export const FUNCAO_EMAIL_ALERTA_TST = import.meta.env.VITE_FUNCAO_EMAIL_ALERTA_TST || "rapid-api";
export const LIMITE_STORAGE_MB = Number(import.meta.env.VITE_STORAGE_LIMITE_MB || 1024);

export const UPLOAD_BLOQUEAR_ACIMA_5MB = String(import.meta.env.VITE_BLOQUEAR_UPLOAD_ACIMA_5MB || "true") !== "false";
export const UPLOAD_LIMITE_FORTE_MB = Number(import.meta.env.VITE_UPLOAD_LIMITE_FORTE_MB || 5);
export const UPLOAD_MENSAGEM_ARQUIVO_GRANDE =
    "O arquivo está muito grande. Para reduzir o uso de armazenamento, compacte o PDF antes de enviar. Recomendamos escanear documentos em 150 ou 200 DPI, em preto e branco ou tons de cinza quando possível.";

export const perfisUpload = {
    documentoSimples: {
        rotulo: "Documento simples",
        limiteIdealBytes: 2 * 1024 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "até 2 MB",
    },
    documentoExtenso: {
        rotulo: "Documento extenso",
        limiteIdealBytes: 5 * 1024 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "até 5 MB",
    },
    fotoAuditoria: {
        rotulo: "Foto / imagem",
        limiteIdealBytes: 800 * 1024,
        limiteForteBytes: UPLOAD_LIMITE_FORTE_MB * 1024 * 1024,
        recomendacao: "preferencialmente até 800 KB",
    },
};

export const treinamentosBase = [
    { id: 21, nome: "Ficha de Registro - CLT / eSocial", validadePadrao: null, categoria: "Documento sem validade", base: "CLT / eSocial / admissional" },

    { id: 1, nome: "NR-01 Integração / Mobilização SST", validadePadrao: 365, categoria: "Obrigatório", base: "NR-01 / Integração de obra" },
    { id: 15, nome: "NR-01 Ordem de Serviço da Função", validadePadrao: 365, categoria: "Documento", base: "NR-01 / Ordem de Serviço" },
    { id: 13, nome: "NR-01 / NR-18 Procedimento Operacional da Função / OS", validadePadrao: 365, categoria: "Atividade", base: "NR-01 / NR-18 / PGR / APR" },
    { id: 8, nome: "NR-06 Uso Correto de EPIs", validadePadrao: 365, categoria: "Obrigatório", base: "NR-06 / NR-01" },
    { id: 14, nome: "NR-06 Ficha de EPIs atualizada", validadePadrao: 365, categoria: "Documento", base: "NR-06 / registro de fornecimento de EPI" },
    { id: 22, nome: "NR-07 ASO - Atestado de Saúde Ocupacional", validadePadrao: 365, categoria: "Documento Médico", base: "NR-07" },
    { id: 4, nome: "NR-10 Segurança em Eletricidade", validadePadrao: 730, categoria: "Elétrica", base: "NR-10" },
    { id: 11, nome: "NR-11 Transporte e Movimentação de Cargas", validadePadrao: 365, categoria: "Movimentação", base: "NR-11" },
    { id: 3, nome: "NR-12 Máquinas e Equipamentos", validadePadrao: 730, categoria: "Operacional", base: "NR-12" },
    { id: 5, nome: "NR-12 / NR-18 PEMT / PTA", validadePadrao: 365, categoria: "Equipamento", base: "NR-18 / NR-12 / fabricante" },
    { id: 7, nome: "NR-12 / NR-18 Lixadeira / Esmerilhadeira", validadePadrao: 365, categoria: "Ferramentas", base: "NR-12 / NR-18" },
    { id: 18, nome: "NR-18 Ergonomia / Orientação Postural", validadePadrao: 365, categoria: "Ergonomia", base: "NR-18 / orientação postural de obra" },
    { id: 9, nome: "NR-18.06 Treinamento de Obra / Construção", validadePadrao: 365, categoria: "Construção", base: "NR-18" },
    { id: 12, nome: "NR-18 Escavação / Abertura de Valas", validadePadrao: 365, categoria: "Construção", base: "NR-18 / procedimento interno" },
    { id: 6, nome: "NR-18 / NR-34 Trabalho a Quente / Solda", validadePadrao: 365, categoria: "Alto Risco", base: "NR-18 / NR-34 como referência técnica" },
    { id: 16, nome: "NR-21 Trabalho a Céu Aberto / Protetor Solar", validadePadrao: 365, categoria: "Ambiental", base: "NR-21 / procedimento interno" },
    { id: 20, nome: "NR-23 Proteção Contra Incêndio", validadePadrao: 365, categoria: "Emergência", base: "NR-23" },
    { id: 17, nome: "NR-25 Meio Ambiente / Resíduos", validadePadrao: 365, categoria: "Meio Ambiente", base: "NR-25 / procedimento interno" },
    { id: 19, nome: "NR-26 Sinalização de Segurança / Vias", validadePadrao: 365, categoria: "Sinalização", base: "NR-26" },
    { id: 10, nome: "NR-33 Espaço Confinado", validadePadrao: 365, categoria: "Alto Risco", base: "NR-33" },
    { id: 2, nome: "NR-35 Trabalho em Altura", validadePadrao: 730, categoria: "Alto Risco", base: "NR-35" },
];

export const documentosEmpresaBase = [
    {
        tipo: "LTCAT",
        nome: "LTCAT",
        validadePadraoDias: 1095,
        regra:
            "Controle interno de 3 anos. Revisar antes do prazo se houver alteração de layout, processo, atividade, equipamentos, agentes nocivos, EPCs, EPIs ou medidas de controle.",
        fundamento: "Base legal: previdenciária/eSocial.",
    },
    {
        tipo: "PCMSO",
        nome: "PCMSO",
        validadePadraoDias: 365,
        regra:
            "Controle anual recomendado, com base nos riscos do PGR, exames ocupacionais, mudanças de função ou alteração da exposição ocupacional.",
        fundamento: "Base normativa: NR-07 e PGR/NR-01.",
    },
    {
        tipo: "PGR",
        nome: "PGR",
        validadePadraoDias: 730,
        regra:
            "Revisar no mínimo a cada 2 anos ou quando houver mudança em processos, layout, equipamentos, medidas de prevenção ou ocorrência relevante.",
        fundamento: "Base normativa: NR-01/GRO/PGR.",
    },
];

export const STATUS_CLASSIFICACAO_COLABORADOR = [
    "Liberado",
    "Com pendência",
    "Bloqueado",
    "Em análise",
    "Desmobilizado",
    "Inativo",
];

export const IDS_DOCUMENTOS_CRITICOS_COLABORADOR = [1, 14, 15, 21, 22];

export const treinamentosBaseObra = [1, 14, 15, 8, 9, 16, 17, 18, 20, 21, 22];

export const matrizTreinamentosPorFuncao = [
    {
        chave: "pedreiro",
        rotulo: "PEDREIRO",
        termos: ["pedreiro", "alvenaria", "bloquete", "pavimentador", "calceteiro"],
        treinamentos: [...treinamentosBaseObra, 11, 13],
    },
    {
        chave: "ajudante",
        rotulo: "AJUDANTE",
        termos: ["ajudante", "servente", "auxiliar"],
        treinamentos: [...treinamentosBaseObra, 11, 13],
    },
    {
        chave: "encarregado",
        rotulo: "ENCARREGADO",
        termos: ["encarregado", "mestre de obras", "supervisor"],
        treinamentos: [...treinamentosBaseObra, 11, 13],
    },
    {
        chave: "carpinteiro",
        rotulo: "CARPINTEIRO",
        termos: ["carpinteiro", "formas", "forma"],
        treinamentos: [...treinamentosBaseObra, 2, 3, 7, 11, 13],
    },
    {
        chave: "op-betoneira",
        rotulo: "OP. DE BETONEIRA",
        termos: ["betoneira", "op. de betoneira", "operador de betoneira"],
        treinamentos: [...treinamentosBaseObra, 3, 11, 13],
    },
    {
        chave: "tecnico-sst",
        rotulo: "TEC. SEG. DO TRAB.",
        termos: ["tecnico de seguranca", "técnico de segurança", "tec. seg", "seguranca do trabalho", "segurança do trabalho", "sst"],
        treinamentos: [...treinamentosBaseObra, 13],
    },
    {
        chave: "lider",
        rotulo: "LÍDER",
        termos: ["lider", "líder", "liderança"],
        treinamentos: [...treinamentosBaseObra, 11, 13],
    },
    {
        chave: "motorista",
        rotulo: "MOTORISTA",
        termos: ["motorista", "condutor"],
        treinamentos: [...treinamentosBaseObra, 11, 19, 13],
    },
    {
        chave: "armador",
        rotulo: "ARMADOR",
        termos: ["armador", "armação", "armacao", "ferreiro"],
        treinamentos: [...treinamentosBaseObra, 2, 11, 13],
    },
    {
        chave: "op-maquinas",
        rotulo: "OP. DE MÁQUINAS",
        termos: ["op. de maquinas", "op de maquinas", "operador de maquinas", "operador de máquinas", "maquinas", "máquinas", "retroescavadeira", "escavadeira", "pa carregadeira", "pá carregadeira"],
        treinamentos: [...treinamentosBaseObra, 3, 11, 19, 13],
    },
    {
        chave: "greidista",
        rotulo: "GREIDISTA",
        termos: ["greidista", "greide", "nivelamento"],
        treinamentos: [...treinamentosBaseObra, 3, 11, 19, 13],
    },
    {
        chave: "soldador",
        rotulo: "SOLDADOR / TRABALHO A QUENTE",
        termos: ["soldador", "solda", "caldeireiro"],
        treinamentos: [...treinamentosBaseObra, 3, 6, 7, 13],
    },
    {
        chave: "operador-pemt",
        rotulo: "OPERADOR DE PEMT / PTA",
        termos: ["pemt", "pta", "plataforma", "cesto", "elevatoria", "elevatória"],
        treinamentos: [...treinamentosBaseObra, 2, 3, 5, 13],
    },
    {
        chave: "eletricista",
        rotulo: "ELETRICISTA",
        termos: ["eletricista", "eletrica", "elétrica", "eletrico", "elétrico"],
        treinamentos: [...treinamentosBaseObra, 2, 3, 4, 13],
    },
    {
        chave: "geral",
        rotulo: "MATRIZ BÁSICA DE OBRA",
        termos: [],
        treinamentos: [...treinamentosBaseObra, 13],
    },
];

export const respostasAuditoriaCampo = [
    { chave: "conforme", texto: "Conforme", pontos: 10, descricaoPontuacao: "10 pontos" },
    { chave: "observacao_leve", texto: "Observação leve", pontos: 8, descricaoPontuacao: "8 pontos" },
    { chave: "nao_conforme", texto: "Não conforme", pontos: 5, descricaoPontuacao: "5 pontos" },
    { chave: "desvio_grave", texto: "Desvio grave", pontos: 0, descricaoPontuacao: "0 ponto + ação imediata" },
    { chave: "nao_aplicavel", texto: "Não aplicável", pontos: 0, descricaoPontuacao: "Ignora o cálculo" },
];

export const categoriasAuditoriaCampo = [
    { chave: "epi", texto: "EPI" },
    { chave: "frente_trabalho", texto: "Frente de trabalho" },
    { chave: "comportamento_seguro", texto: "Comportamento seguro" },
];

export const statusDesvioAuditoriaCampo = ["Aberto", "Em tratativa", "Corrigido", "Cancelado"];
export const gravidadesAuditoriaCampo = ["Leve", "Moderada", "Grave", "Crítica"];


export const tiposAuditoriaCampoDireta = [
    { valor: "area", label: "Área", parametros: ["area"], grupo: "area" },
    { valor: "area_externa", label: "Área externa", parametros: ["externa", "area-externa", "area_externa"], grupo: "area" },
    { valor: "maquina", label: "Máquina", parametros: ["maquina", "máquina"], grupo: "maquina" },
    { valor: "equipamento", label: "Equipamento", parametros: ["equipamento"], grupo: "maquina" },
    { valor: "container", label: "Container", parametros: ["container", "contêiner", "conteiner"], grupo: "area" },
    { valor: "banheiro", label: "Banheiro", parametros: ["banheiro", "sanitario", "sanitário"], grupo: "area" },
    { valor: "veiculo", label: "Veículo", parametros: ["veiculo", "veículo"], grupo: "maquina" },
    { valor: "frente_servico", label: "Frente de serviço", parametros: ["frente-servico", "frente_servico", "frente"], grupo: "frente" },
    { valor: "almoxarifado", label: "Almoxarifado", parametros: ["almoxarifado"], grupo: "area" },
    { valor: "instalacao_provisoria", label: "Instalação provisória", parametros: ["instalacao-provisoria", "instalacao_provisoria", "instalação-provisória"], grupo: "area" },
    { valor: "auditoria_interna_geral", label: "Auditoria interna geral", parametros: ["auditoria-interna-geral", "auditoria_interna_geral", "geral"], grupo: "geral" },
    { valor: "outro", label: "Outro", parametros: ["outro"], grupo: "geral" },
];

export const categoriasPadronizadasAuditoriaCampo = [
    { valor: "isolamento", label: "Isolamento" },
    { valor: "organizacao_area", label: "Organização de área" },
    { valor: "sinalizacao", label: "Sinalização" },
    { valor: "acesso_seguro", label: "Acesso seguro" },
    { valor: "risco_queda", label: "Risco de queda" },
    { valor: "risco_atropelamento", label: "Risco de atropelamento" },
    { valor: "transito_maquinas", label: "Trânsito de máquinas" },
    { valor: "maquina_defeito", label: "Máquina com defeito" },
    { valor: "maquina_improvisacao", label: "Máquina com improvisação" },
    { valor: "vazamento", label: "Vazamento" },
    { valor: "epi", label: "EPI" },
    { valor: "outro", label: "Outro" },
];

export const statusAuditoriaCampoDireta = ["Aberta", "Em andamento", "Resolvida", "Cancelada", "Vencida"];
export const grausRiscoAuditoriaCampoDireta = ["Baixo", "Médio", "Alto", "Crítico"];
export const descricoesGrauRiscoAuditoriaCampoDireta = {
    Baixo: "Condição simples, sem risco imediato. Pode ser tratada na rotina normal.",
    Médio: "Pode gerar incidente ou desvio se não for corrigida. Requer prazo e responsável.",
    Alto: "Risco relevante para pessoas, máquinas ou operação. Priorizar correção e acompanhamento.",
    Crítico: "Risco grave ou iminente. Exige ação imediata e controle antes da continuidade da atividade.",
};

export const checklistDinamicoAuditoriaCampo = {
    area: [
        "Organização e limpeza",
        "Isolamento adequado",
        "Sinalização",
        "Acesso seguro",
        "Risco de queda",
        "Risco de atropelamento",
        "Trânsito de máquinas",
        "Armazenamento de materiais",
        "Iluminação",
        "Interferência com pedestres",
    ],
    maquina: [
        "Proteções instaladas",
        "Botão de emergência",
        "Sinalização da máquina",
        "Vazamentos",
        "Partes móveis protegidas",
        "Condição elétrica",
        "Condição mecânica",
        "Bloqueio de energia",
        "Acesso seguro",
        "Condição geral do equipamento",
    ],
    frente: [
        "APR disponível",
        "Equipe orientada",
        "EPIs utilizados",
        "Ferramentas adequadas",
        "Isolamento da atividade",
        "Riscos críticos controlados",
        "Permissão de trabalho, quando aplicável",
        "Organização da frente de serviço",
    ],
    geral: [
        "Condição segura do local",
        "Organização e limpeza",
        "Sinalização aplicável",
        "Riscos críticos controlados",
        "Ação recomendada definida",
    ],
};
