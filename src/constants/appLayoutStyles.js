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
`;
