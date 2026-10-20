import {
    analyzeRepository,
    DOMAIN_TABLES,
    renderCsv,
    renderMarkdown,
} from './operationalRevocationMutationMatrixAudit.mjs';

import {
    registerOperationalRevocationAuditSharedTests,
} from './operationalRevocationMutationMatrixAuditSharedTests.mjs';

registerOperationalRevocationAuditSharedTests({
    analyzeRepository,
    DOMAIN_TABLES,
    renderCsv,
    renderMarkdown,
});