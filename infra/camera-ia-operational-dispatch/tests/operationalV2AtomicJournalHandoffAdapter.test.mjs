import test from 'node:test';

import {
    createOperationalV2AtomicJournalHandoffAdapter,
    OUTBOX_LEASE_V2_SQL,
    JOURNAL_HANDOFF_V2_SQL,
} from '../src/operationalV2AtomicJournalHandoffAdapter.mjs';

import {
    runAtomicJournalHandoffContract,
} from './atomicJournalHandoffAdapterContract.mjs';

test(
    'operational V2 atomic journal handoff adapter — offline contract',
    async () => {
        await runAtomicJournalHandoffContract({
            createAdapter:
                createOperationalV2AtomicJournalHandoffAdapter,

            outboxLeaseSql:
                OUTBOX_LEASE_V2_SQL,

            journalHandoffSql:
                JOURNAL_HANDOFF_V2_SQL,

            handoffSqlPattern:
                /private\.camera_ia_handoff_operational_journal_v2/,

            forbiddenHandoffPattern:
                /private\.camera_ia_handoff_operational_journal\(/,

            markerPrefix:
                'B4C',

            finalMarker:
                'R10K_3C4F_C3FB4C_OFFLINE_ADAPTER=GREEN',
        });
    },
);