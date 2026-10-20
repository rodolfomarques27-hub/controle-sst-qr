import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createOperationalScopedSseCursor} from '../src/operationalScopedSseCursor.mjs';

const scope={userId:'11111111-1111-4111-8111-111111111111',
    tenantId:'22222222-2222-4222-8222-222222222222',
    empresaId:'33333333-3333-4333-8333-333333333333',cameraId:'cam-A'};

test('B4D cursor: signed deterministic and scope/user bound across instances',()=>{
    const key=randomBytes(32),first=createOperationalScopedSseCursor({key}),
        restarted=createOperationalScopedSseCursor({key});
    const token=first.encode(scope,'9223372036854775807');
    assert.equal(restarted.decode(token,scope),'9223372036854775807');
    assert.equal(first.encode(scope,'9223372036854775807'),token);
    assert.match(token,/^v1\./);
    for(const changed of [
        {...scope,userId:'44444444-4444-4444-8444-444444444444'},
        {...scope,tenantId:'44444444-4444-4444-8444-444444444444'},
        {...scope,empresaId:'44444444-4444-4444-8444-444444444444'},
        {...scope,cameraId:'cam-B'}]) assert.throws(()=>first.decode(token,changed),/invalid_last_event_id/);
    assert.throws(()=>createOperationalScopedSseCursor({key:randomBytes(32)}).decode(token,scope));
    console.log('B4D_SCOPED_HMAC_CURSOR_CROSS_PROCESS_RESTART=GREEN');
});

test('B4D cursor: tamper, malformed, bigint and absent key fail closed',()=>{
    for(const key of [undefined,'fake',Buffer.alloc(1),Buffer.alloc(129)]) {
        assert.throws(()=>createOperationalScopedSseCursor({key}));
    }
    const signer=createOperationalScopedSseCursor({key:randomBytes(32)});
    const id=signer.encode(scope,'12');
    for(const altered of [id.slice(0,-1)+(id.at(-1)==='a'?'b':'a'),
        id.replace(/^v1/,'v2'),id+'\r\n',id+'x','0',
        'v1.'+'Z'.repeat(800)+'.signature',
        ...[{},[],null,123,''].map(v=>v)]) {
        assert.throws(()=>signer.decode(altered,scope));
    }
    for(const n of [12,12n,'01','-1','9223372036854775808','1;DROP',null]) {
        assert.throws(()=>signer.encode(scope,n));
    }
    assert.equal(signer.decode(signer.encode(scope,'0'),scope),'0');
    console.log('B4D_CURSOR_TAMPER_BIGINT_FAIL_CLOSED=GREEN');
});
