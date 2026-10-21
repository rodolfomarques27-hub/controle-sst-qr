import assert from 'node:assert/strict';
import {
    randomUUID,
} from 'node:crypto';
import {
    EventEmitter,
} from 'node:events';

import {
    createOperationalOutboxAclSseConsumer,
} from '../src/operationalOutboxAclSseConsumer.mjs';

const tenantId =
    '11111111-1111-4111-8111-111111111111';

const empresaId =
    '22222222-2222-4222-8222-222222222222';

const userId =
    '33333333-3333-4333-8333-333333333333';

const workerId =
    '44444444-4444-4444-8444-444444444444';

const otherTenant =
    '55555555-5555-4555-8555-555555555555';

const jwt =
    `Bearer ${'u'.repeat(40)}`;

const baseline =
    1792000000000;

const flush =
    async () => {
        for (
            let index = 0;
            index < 8;
            index += 1
        ) {
            await new Promise(
                setImmediate,
            );
        }
    };

const options =
    () => ({
        workerId,
        batchSize:
            10,
        leaseSeconds:
            60,
    });

const eventFor =
    lease =>
        Object.freeze({
            deviceId:
                lease.deviceId,

            eventId:
                lease.eventId,

            cameraId:
                lease.cameraId,

            tenantId:
                lease.tenantId,

            empresaId:
                lease.empresaId,

            accepted:
                false,

            status:
                lease.status,
        });

export async function runAtomicJournalHandoffContract({
    createAdapter,
    outboxLeaseSql,
    journalHandoffSql,
    handoffSqlPattern,
    forbiddenHandoffPattern = null,
    markerPrefix,
    finalMarker,
}) {
    function fixture() {
        let now =
            baseline;

        let deviceActive =
            true;

        let cameraEnabled =
            true;

        let tenantActive =
            true;

        let userActive =
            true;

        let dbOffline =
            false;

        let denyRole =
            false;

        let forceFalse =
            false;

        let failBeforeCommit =
            false;

        let throwAfterCommit =
            false;

        let beforeHandoff =
            null;

        let afterHandoff =
            null;

        let leases =
            0;

        let handoffs =
            0;

        let directAcks =
            0;

        let commitCount =
            0;

        const pending =
            new Map();

        const journal =
            new Map();

        const calls =
            [];

        function add(
            status = 'NO_FACE',
            values = {},
        ) {
            const row = {
                deviceId:
                    'device-A',

                eventId:
                    randomUUID(),

                cameraId:
                    'cam-A',

                tenantId,

                empresaId,

                status,

                accepted:
                    false,

                leaseToken:
                    randomUUID(),

                leaseUntil:
                    new Date(
                        now + 60000,
                    ).toISOString(),

                ...values,
            };

            pending.set(
                `${row.deviceId}:${row.eventId}`,
                {
                    row,
                    owner:
                        null,
                    until:
                        0,
                    dispatched:
                        false,
                },
            );

            return row;
        }

        async function query(
            sql,
            params,
        ) {
            calls.push({
                sql,
                params:
                    structuredClone(
                        params,
                    ),
            });

            assert.ok(
                Object.isFrozen(
                    params,
                ),
            );

            if (dbOffline) {
                throw new Error(
                    'mock_database_offline',
                );
            }

            if (
                sql ===
                outboxLeaseSql
            ) {
                assert.equal(
                    params.length,
                    3,
                );

                assert.match(
                    sql,
                    /private\.camera_ia_lease_operational_outbox/,
                );

                assert.doesNotMatch(
                    sql,
                    /camera_ia_ack_operational_outbox/,
                );

                leases += 1;

                const [
                    worker,
                    batch,
                    seconds,
                ] =
                    params;

                if (denyRole) {
                    return {
                        rows:
                            [],
                    };
                }

                const results =
                    [];

                for (
                    const item
                    of pending.values()
                ) {
                    if (
                        results.length >= batch
                    ) {
                        break;
                    }

                    if (
                        item.dispatched ||
                        item.until > now ||
                        !deviceActive ||
                        !cameraEnabled ||
                        !tenantActive
                    ) {
                        continue;
                    }

                    item.owner =
                        worker;

                    item.until =
                        now +
                        seconds * 1000;

                    item.row.leaseToken =
                        randomUUID();

                    item.row.leaseUntil =
                        new Date(
                            item.until,
                        ).toISOString();

                    results.push({
                        ...item.row,
                    });
                }

                return {
                    rows:
                        results,
                };
            }

            if (
                sql ===
                journalHandoffSql
            ) {
                assert.equal(
                    params.length,
                    4,
                );

                assert.match(
                    sql,
                    handoffSqlPattern,
                );

                if (
                    forbiddenHandoffPattern
                ) {
                    assert.doesNotMatch(
                        sql,
                        forbiddenHandoffPattern,
                    );
                }

                assert.doesNotMatch(
                    sql,
                    /camera_ia_ack_operational_outbox/,
                );

                handoffs += 1;

                if (beforeHandoff) {
                    await beforeHandoff();
                }

                if (failBeforeCommit) {
                    throw new Error(
                        'mock_tx_rollback',
                    );
                }

                const [
                    who,
                    deviceId,
                    eventId,
                    token,
                ] =
                    params;

                const item =
                    pending.get(
                        `${deviceId}:${eventId}`,
                    );

                const valid =
                    !denyRole &&
                    !forceFalse &&
                    item &&
                    !item.dispatched &&
                    item.owner === who &&
                    item.row.leaseToken === token &&
                    item.until > now &&
                    deviceActive &&
                    cameraEnabled &&
                    tenantActive &&
                    item.row.tenantId === tenantId &&
                    item.row.empresaId === empresaId &&
                    item.row.cameraId === 'cam-A' &&
                    item.row.accepted === false &&
                    [
                        'NO_FACE',
                        'MULTIPLE_FACES',
                    ].includes(
                        item.row.status,
                    );

                if (!valid) {
                    return {
                        rows: [
                            {
                                handed_off:
                                    false,
                            },
                        ],
                    };
                }

                item.dispatched =
                    true;

                const key =
                    `${deviceId}:${eventId}`;

                if (
                    !journal.has(key)
                ) {
                    journal.set(
                        key,
                        structuredClone(
                            item.row,
                        ),
                    );

                    commitCount +=
                        1;
                }

                if (afterHandoff) {
                    await afterHandoff();
                }

                if (throwAfterCommit) {
                    throw new Error(
                        'mock_response_lost_after_commit',
                    );
                }

                return {
                    rows: [
                        {
                            handed_off:
                                true,
                        },
                    ],
                };
            }

            throw new Error(
                'unexpected_sql_statement',
            );
        }

        const adapter =
            () =>
                createAdapter({
                    query,
                    nowImpl:
                        () => now,
                });

        const getCameraBinding =
            async id =>
                id === 'cam-A' &&
                cameraEnabled
                    ? {
                        cameraId:
                            'cam-A',
                        tenantId,
                        empresaId,
                    }
                    : null;

        const getTrustedDeliveryScope =
            async scope => ({
                deviceId:
                    scope.deviceId,
                cameraId:
                    scope.cameraId,
                tenantId,
                empresaId,
                deviceActive,
                cameraEnabled,
                tenantActive,
            });

        async function fetchImpl(
            url,
            requestOptions,
        ) {
            assert.equal(
                requestOptions.headers.authorization,
                jwt,
            );

            if (
                url.endsWith(
                    '/auth/v1/user',
                )
            ) {
                return {
                    ok:
                        userActive,

                    status:
                        userActive
                            ? 200
                            : 401,

                    text:
                        async () =>
                            JSON.stringify({
                                id:
                                    userId,
                            }),
                };
            }

            if (
                url.endsWith(
                    '/rest/v1/rpc/camera_ia_autorizar_visualizacao',
                )
            ) {
                return {
                    ok:
                        true,

                    status:
                        200,

                    headers: {
                        get:
                            () =>
                                'application/json',
                    },

                    text:
                        async () =>
                            JSON.stringify(
                                userActive &&
                                cameraEnabled &&
                                tenantActive &&
                                JSON.parse(
                                    requestOptions.body,
                                ).p_camera_id ===
                                    'cam-A'
                                    ? [
                                        {
                                            camera_id:
                                                'cam-A',

                                            tenant_id:
                                                tenantId,

                                            empresa_id:
                                                empresaId,
                                        },
                                    ]
                                    : [],
                            ),
                };
            }

            throw new Error(
                'untrusted_url',
            );
        }

        const createConsumer =
            () =>
                createOperationalOutboxAclSseConsumer({
                    supabaseUrl:
                        'https://mock.supabase.co',

                    anonKey:
                        'a'.repeat(40),

                    fetchImpl,
                    getCameraBinding,
                    getTrustedDeliveryScope,

                    nowImpl:
                        () => now,

                    ...adapter(),
                });

        function viewer() {
            const req =
                new EventEmitter();

            req.method =
                'GET';

            req.headers = {
                authorization:
                    jwt,
            };

            const res =
                new EventEmitter();

            res.chunks =
                [];

            res.writeHead =
                (
                    status,
                    headers,
                ) => {
                    res.status =
                        status;

                    res.headers =
                        headers;
                };

            res.write =
                chunk => {
                    res.chunks.push(
                        chunk,
                    );

                    return true;
                };

            res.end =
                (
                    chunk = '',
                ) => {
                    if (chunk) {
                        res.chunks.push(
                            chunk,
                        );
                    }

                    res.writableEnded =
                        true;

                    res.emit(
                        'close',
                    );
                };

            return {
                req,
                res,
            };
        }

        return {
            add,
            pending,
            journal,
            calls,
            adapter,
            createConsumer,
            viewer,

            get leases() {
                return leases;
            },

            get handoffs() {
                return handoffs;
            },

            get directAcks() {
                return directAcks;
            },

            get commits() {
                return commitCount;
            },

            now:
                () => now,

            advance:
                milliseconds =>
                    now += milliseconds,

            setDevice:
                value =>
                    deviceActive =
                        value,

            setCamera:
                value =>
                    cameraEnabled =
                        value,

            setTenant:
                value =>
                    tenantActive =
                        value,

            setUser:
                value =>
                    userActive =
                        value,

            setDbOffline:
                value =>
                    dbOffline =
                        value,

            setDenyRole:
                value =>
                    denyRole =
                        value,

            setForceFalse:
                value =>
                    forceFalse =
                        value,

            setFailBeforeCommit:
                value =>
                    failBeforeCommit =
                        value,

            setThrowAfterCommit:
                value =>
                    throwAfterCommit =
                        value,

            setBeforeHandoff:
                value =>
                    beforeHandoff =
                        value,

            setAfterHandoff:
                value =>
                    afterHandoff =
                        value,
        };
    }

    const mark =
        suffix =>
            console.log(
                `${markerPrefix}_${suffix}=GREEN`,
            );

    assert.throws(
        () =>
            createAdapter(),
        /trusted_sql_and_clock_required/,
    );

    assert.match(
        journalHandoffSql,
        /current_user = 'cam_ia_operational_outbox_dispatcher'/,
    );

    assert.doesNotMatch(
        outboxLeaseSql +
        journalHandoffSql,
        /\b(DELETE|UPDATE|INSERT)\b|private\.camera_ia_ack_operational_outbox/i,
    );

    mark(
        'FIXED_PARAMETERIZED_LEASE_AND_ATOMIC_HANDOFF_SQL',
    );

    const firstFixture =
        fixture();

    const consumer =
        firstFixture.createConsumer();

    const {
        req,
        res,
    } =
        firstFixture.viewer();

    assert.equal(
        await consumer.handleAuthorizedSse(
            req,
            res,
            {
                cameraId:
                    'cam-A',
            },
        ),
        true,
    );

    firstFixture.add(
        'NO_FACE',
    );

    const first =
        await consumer.drainOnce(
            options(),
        );

    assert.deepEqual(
        first,
        {
            leased:
                1,
            durable:
                1,
            acknowledged:
                1,
            signaled:
                0,
            deferred:
                0,
            failed:
                0,
        },
    );

    firstFixture.add(
        'MULTIPLE_FACES',
    );

    const second =
        await consumer.drainOnce(
            options(),
        );

    assert.equal(
        second.acknowledged,
        1,
    );

    assert.equal(
        second.signaled,
        1,
    );

    await flush();

    assert.equal(
        firstFixture.journal.size,
        2,
    );

    assert.equal(
        firstFixture.commits,
        2,
    );

    assert.equal(
        firstFixture.handoffs,
        2,
    );

    assert.equal(
        firstFixture.directAcks,
        0,
    );

    assert.match(
        res.chunks.join(''),
        /"status":"MULTIPLE_FACES"/,
    );

    assert.match(
        res.chunks.join(''),
        /"accepted":false/,
    );

    assert.doesNotMatch(
        res.chunks.join(''),
        /device-A|eventId|tenantId|empresaId/,
    );

    assert.ok(
        firstFixture.calls.every(
            call =>
                call.sql ===
                    outboxLeaseSql ||
                call.sql ===
                    journalHandoffSql,
        ),
    );

    mark(
        'REAL_C3FA_CONTRACT_ATOMIC_HANDOFF_NO_LEGACY_ACK',
    );

    const local =
        fixture();

    const localAdapter =
        local.adapter();

    local.add();

    const [
        lease,
    ] =
        await localAdapter
            .leaseOperationalOutbox(
                options(),
            );

    const input =
        eventFor(
            lease,
        );

    assert.equal(
        localAdapter
            .ackOperationalOutbox({
                workerId,
                deviceId:
                    lease.deviceId,
                eventId:
                    lease.eventId,
                leaseToken:
                    lease.leaseToken,
            }),
        false,
    );

    assert.equal(
        local.handoffs,
        0,
    );

    const durableReceipt =
        await localAdapter
            .handoffDurably(
                input,
            );

    assert.deepEqual(
        durableReceipt,
        {
            durable:
                true,
            deviceId:
                lease.deviceId,
            eventId:
                lease.eventId,
            cameraId:
                lease.cameraId,
            tenantId:
                lease.tenantId,
            empresaId:
                lease.empresaId,
        },
    );

    assert.equal(
        await localAdapter
            .handoffDurably(
                input,
            ),
        durableReceipt,
    );

    assert.equal(
        local.handoffs,
        1,
    );

    assert.equal(
        localAdapter
            .ackOperationalOutbox({
                workerId:
                    randomUUID(),

                deviceId:
                    lease.deviceId,

                eventId:
                    lease.eventId,

                leaseToken:
                    lease.leaseToken,
            }),
        false,
    );

    assert.equal(
        localAdapter
            .ackOperationalOutbox({
                workerId,

                deviceId:
                    lease.deviceId,

                eventId:
                    lease.eventId,

                leaseToken:
                    randomUUID(),
            }),
        false,
    );

    assert.equal(
        localAdapter
            .ackOperationalOutbox({
                workerId,

                deviceId:
                    lease.deviceId,

                eventId:
                    lease.eventId,

                leaseToken:
                    lease.leaseToken,
            }),
        true,
    );

    assert.equal(
        localAdapter
            .ackOperationalOutbox({
                workerId,

                deviceId:
                    lease.deviceId,

                eventId:
                    lease.eventId,

                leaseToken:
                    lease.leaseToken,
            }),
        false,
    );

    assert.equal(
        local.handoffs,
        1,
    );

    assert.equal(
        local.commits,
        1,
    );

    mark(
        'RECEIPT_ONE_SHOT_NO_SEPARATE_ACK',
    );

    for (
        const kind of
        [
            'rollback',
            'return_false',
            'db_down',
            'revoked_device',
            'revoked_camera',
            'revoked_tenant',
        ]
    ) {
        const current =
            fixture();

        current.add();

        if (kind === 'rollback') {
            current.setFailBeforeCommit(
                true,
            );
        }

        if (kind === 'return_false') {
            current.setForceFalse(
                true,
            );
        }

        if (kind === 'db_down') {
            current.setDbOffline(
                true,
            );
        }

        if (kind === 'revoked_device') {
            current.setBeforeHandoff(
                async () =>
                    current.setDevice(
                        false,
                    ),
            );
        }

        if (kind === 'revoked_camera') {
            current.setBeforeHandoff(
                async () =>
                    current.setCamera(
                        false,
                    ),
            );
        }

        if (kind === 'revoked_tenant') {
            current.setBeforeHandoff(
                async () =>
                    current.setTenant(
                        false,
                    ),
            );
        }

        if (kind === 'db_down') {
            await assert.rejects(
                current
                    .createConsumer()
                    .drainOnce(
                        options(),
                    ),
                /mock_database_offline/,
            );
        }
        else {
            const result =
                await current
                    .createConsumer()
                    .drainOnce(
                        options(),
                    );

            assert.equal(
                result.acknowledged,
                0,
                kind,
            );
        }

        assert.equal(
            current.commits,
            0,
            kind,
        );

        assert.equal(
            current.journal.size,
            0,
            kind,
        );
    }

    mark(
        'REVOCATION_ROLLBACK_DB_UNAVAILABLE_FAIL_CLOSED',
    );

    const foreign =
        fixture();

    foreign.add(
        'NO_FACE',
        {
            tenantId:
                otherTenant,
        },
    );

    let result =
        await foreign
            .createConsumer()
            .drainOnce(
                options(),
            );

    assert.equal(
        result.acknowledged,
        0,
    );

    assert.equal(
        foreign.journal.size,
        0,
    );

    const unsafe =
        fixture();

    unsafe.add(
        'NO_FACE',
        {
            embedding: [
                1,
                2,
                3,
            ],
        },
    );

    await assert.rejects(
        unsafe
            .createConsumer()
            .drainOnce(
                options(),
            ),
        /untrusted_outbox_lease/,
    );

    assert.equal(
        unsafe.journal.size,
        0,
    );

    const badEvent =
        fixture();

    badEvent.add();

    const adapter =
        badEvent.adapter();

    const [
        leased,
    ] =
        await adapter
            .leaseOperationalOutbox(
                options(),
            );

    await assert.rejects(
        adapter.handoffDurably({
            ...eventFor(
                leased,
            ),

            cameraId:
                'cam-other',
        }),
        /unleased_or_out_of_scope_event/,
    );

    await assert.rejects(
        adapter.handoffDurably({
            ...eventFor(
                leased,
            ),

            embedding: [
                4,
            ],
        }),
        /unleased_or_out_of_scope_event/,
    );

    assert.equal(
        badEvent.handoffs,
        0,
    );

    mark(
        'TENANT_COMPANY_CAMERA_AND_BIOMETRIC_FAIL_CLOSED',
    );

    const responseLost =
        fixture();

    responseLost.add();

    responseLost.setThrowAfterCommit(
        true,
    );

    result =
        await responseLost
            .createConsumer()
            .drainOnce(
                options(),
            );

    assert.equal(
        result.acknowledged,
        0,
    );

    assert.equal(
        responseLost.commits,
        1,
    );

    assert.equal(
        responseLost.journal.size,
        1,
    );

    responseLost.advance(
        61000,
    );

    result =
        await responseLost
            .createConsumer()
            .drainOnce(
                options(),
            );

    assert.equal(
        result.leased,
        0,
    );

    assert.equal(
        responseLost.commits,
        1,
    );

    assert.equal(
        responseLost.directAcks,
        0,
    );

    mark(
        'UNKNOWN_COMMIT_RESTART_JOURNAL_RECOVERY_NOT_FAKED',
    );

    const retry =
        fixture();

    retry.add();

    retry.setFailBeforeCommit(
        true,
    );

    result =
        await retry
            .createConsumer()
            .drainOnce(
                options(),
            );

    assert.equal(
        result.acknowledged,
        0,
    );

    assert.equal(
        retry.commits,
        0,
    );

    retry.setFailBeforeCommit(
        false,
    );

    retry.advance(
        61000,
    );

    result =
        await retry
            .createConsumer()
            .drainOnce(
                options(),
            );

    assert.equal(
        result.acknowledged,
        1,
    );

    assert.equal(
        retry.commits,
        1,
    );

    assert.equal(
        retry.journal.size,
        1,
    );

    mark(
        'EXPIRED_LEASE_RETRY_IDEMPOTENT',
    );

    const collision =
        fixture();

    collision.add();

    const workers =
        Array.from(
            {
                length:
                    16,
            },
            () =>
                collision.createConsumer(),
        );

    const results =
        await Promise.all(
            workers.map(
                worker =>
                    worker.drainOnce({
                        ...options(),

                        workerId:
                            randomUUID(),
                    }),
            ),
        );

    assert.equal(
        results.reduce(
            (
                count,
                item,
            ) =>
                count +
                item.acknowledged,
            0,
        ),
        1,
    );

    assert.equal(
        collision.commits,
        1,
    );

    assert.equal(
        collision.handoffs,
        1,
    );

    mark(
        '16_CONCURRENT_CONSUMERS_SINGLE_SQL_COMMIT',
    );

    const simultaneous =
        fixture();

    simultaneous.add();

    const simultaneousAdapter =
        simultaneous.adapter();

    const [
        simultaneousLease,
    ] =
        await simultaneousAdapter
            .leaseOperationalOutbox(
                options(),
            );

    let unlock;

    const wait =
        new Promise(
            resolve => {
                unlock =
                    resolve;
            },
        );

    simultaneous.setBeforeHandoff(
        () => wait,
    );

    const ongoing =
        simultaneousAdapter
            .handoffDurably(
                eventFor(
                    simultaneousLease,
                ),
            );

    await assert.rejects(
        simultaneousAdapter
            .handoffDurably(
                eventFor(
                    simultaneousLease,
                ),
            ),
        /duplicate_handoff_in_flight/,
    );

    unlock();

    await ongoing;

    assert.equal(
        simultaneous.handoffs,
        1,
    );

    mark(
        'NO_PARALLEL_HANDOFF_FOR_SAME_LEASE',
    );

    const role =
        fixture();

    role.add();

    role.setDenyRole(
        true,
    );

    result =
        await role
            .createConsumer()
            .drainOnce(
                options(),
            );

    assert.equal(
        result.leased,
        0,
    );

    assert.equal(
        role.handoffs,
        0,
    );

    mark(
        'UNAUTHORIZED_ROLE_NO_LEASE',
    );

    console.log(
        finalMarker,
    );

    console.log(
        'REAL_DB=FALSE; AUTH_RPC=MOCK_FETCH; SQL=ATOMIC_HANDOFF_MOCK; SSE=UNMOUNTED',
    );
}