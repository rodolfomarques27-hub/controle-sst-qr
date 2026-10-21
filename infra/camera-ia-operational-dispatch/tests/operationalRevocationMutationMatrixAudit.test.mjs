import {
    analyzeRepository,
    DOMAIN_TABLES,
    renderCsv,
    renderMarkdown,
} from './operationalRevocationMutationMatrixAudit.mjs';

import {
    registerOperationalRevocationAuditSharedTests as test,
} from './operationalRevocationMutationMatrixAuditSharedTests.mjs';

test({
    analyzeRepository,
    DOMAIN_TABLES,
    renderCsv,
    renderMarkdown,
});