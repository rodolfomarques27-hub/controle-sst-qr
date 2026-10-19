/** SafeScan Brasil | R10K-3C4F-C3F-B4-D | OFFLINE / UNMOUNTED
 * HMAC-signed, scope-bound SSE resume token. Key MUST be injected by the
 * trusted backend and kept stable across workers/restarts. No default key.
 * Not encrypted: tokens contain the scoped UUIDs. Never log tokens or keys.
 */
import {createHmac, timingSafeEqual} from 'node:crypto';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAMERA=/^[A-Za-z0-9_.:-]{1,160}$/;
const DECIMAL=/^(?:0|[1-9][0-9]{0,18})$/;
const MAX=9223372036854775807n;
const TOKEN=/^v1\.([A-Za-z0-9_-]{1,420})\.([A-Za-z0-9_-]{43})$/;

function validScope(scope){
    if (!scope || typeof scope!=='object' || Array.isArray(scope) ||
        typeof scope.userId!=='string' || !UUID.test(scope.userId) ||
        typeof scope.tenantId!=='string' || !UUID.test(scope.tenantId) ||
        typeof scope.empresaId!=='string' || !UUID.test(scope.empresaId) ||
        typeof scope.cameraId!=='string' || !CAMERA.test(scope.cameraId)) {
        throw new Error('invalid_signed_cursor_scope');
    }
    return [scope.userId.toLowerCase(),scope.tenantId.toLowerCase(),
        scope.empresaId.toLowerCase(),scope.cameraId];
}
function sequenceOf(value){
    if (typeof value!=='string' || !DECIMAL.test(value) || BigInt(value)>MAX) {
        throw new Error('invalid_signed_cursor_sequence');
    }
    return value;
}

export function createOperationalScopedSseCursor({key}={}){
    if (!(key instanceof Uint8Array) || key.byteLength<32 || key.byteLength>128) {
        throw new TypeError('stable_injected_sse_cursor_key_required');
    }
    const secret=Buffer.from(key); // Copy, never mutate the caller's buffer.
    const sign=value=>createHmac('sha256',secret).update(value,'utf8').digest();
    function encode(scope,sequence){
        const values=validScope(scope);
        const data=Buffer.from(JSON.stringify([...values,sequenceOf(sequence)]),'utf8').toString('base64url');
        const token=`v1.${data}.${sign(`v1.${data}`).toString('base64url')}`;
        if (token.length>512) throw new Error('signed_cursor_oversize');
        return token;
    }
    function decode(token,expectedScope){
        const scope=validScope(expectedScope);
        if (typeof token!=='string' || token.length>512 || token.includes('\n') || token.includes('\r')) {
            throw new Error('invalid_last_event_id');
        }
        const match=TOKEN.exec(token);
        if (!match) throw new Error('invalid_last_event_id');
        const [ ,encoded,mac]=match;
        const found=Buffer.from(mac,'base64url');
        if (found.length!==32 || found.toString('base64url')!==mac ||
            !timingSafeEqual(sign(`v1.${encoded}`),found)) throw new Error('invalid_last_event_id');
        const original=Buffer.from(encoded,'base64url');
        if (original.toString('base64url')!==encoded || original.byteLength>315) {
            throw new Error('invalid_last_event_id');
        }
        let payload;
        try {payload=JSON.parse(original.toString('utf8'));}catch{throw new Error('invalid_last_event_id');}
        if (!Array.isArray(payload) || payload.length!==5 ||
            !scope.every((part,index)=>part===payload[index])) throw new Error('invalid_last_event_id');
        const seq=sequenceOf(payload[4]);
        // A canonical representation prevents multiple ids for the same cursor.
        if (encode(expectedScope,seq)!==token) throw new Error('invalid_last_event_id');
        return seq;
    }
    return Object.freeze({encode,decode});
}
