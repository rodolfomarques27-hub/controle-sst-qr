import test from 'node:test';

import {
    createOperationalAtomicJournalHandoffAdapter,
    OUTBOX_LEASE_SQL,
    JOURNAL_HANDOFF_SQL,
} from '../src/operationalAtomicJournalHandoffAdapter.mjs';

import {
    runAtomicJournalHandoffContract,
} from './atomicJournalHandoffAdapterContract.mjs';

test(
    'operational atomic journal handoff adapter — offline contract',
    async () => {
        await runAtomicJournalHandoffContract({
            createAdapter:
                createOperationalAtomicJournalHandoffAdapter,

            outboxLeaseSql:
                OUTBOX_LEASE_SQL,

            journalHandoffSql:
                JOURNAL_HANDOFF_SQL,

            handoffSqlPattern:
                /private\.camera_ia_handoff_operational_journal/,

            markerPrefix:
                'B3',

            finalMarker:
                'R10K_3C4F_C3FB3_OFFLINE_ADAPTER=GREEN',
        });
    },
);