/** SafeScan Brasil | R10K-3C4F-C3F-B4-D | OFFLINE / UNMOUNTED
 * Finite replay-only HTTP/SSE controller. No listener, polling loop, camera,
 * secrets, database client or public route. NOT a standalone browser endpoint:
 * a trusted backend must supply the existing JWT + user RPC/ACL adapter,
 * camera binding and a restricted private journal SQL query provider.
 * Browser EventSource cannot inject Authorization bearer headers by itself.
 * Use only behind an authorized trusted transport in future integration.
 */
import {createOperationalV2RecoverableJournalReader} from './operationalV2RecoverableJournalReader.mjs';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAMERA=/^[A-Za-z0-9_.:-]{1,160}$/;
const RESYNC=/journal_resync_required|journal_missing_or_extra_sequence|journal_sequence_gap|journal_cursor|legacy_journal_cutover|invalid_journal_cursor|journal_scope_changed_or_revoked/i;
function normalize(authorized,binding,cameraId){
    if (!authorized || typeof authorized!=='object' || Array.isArray(authorized) ||
        typeof authorized.userId!=='string' || !UUID.test(authorized.userId) ||
        typeof authorized.tenantId!=='string' || !UUID.test(authorized.tenantId) ||
        typeof authorized.empresaId!=='string' || !UUID.test(authorized.empresaId) ||
        authorized.cameraId!==cameraId ||
        !binding || typeof binding!=='object' || Array.isArray(binding) ||
        binding.cameraId!==cameraId || typeof binding.tenantId!=='string' || !UUID.test(binding.tenantId) ||
        typeof binding.empresaId!=='string' || !UUID.test(binding.empresaId) ||
        authorized.tenantId.toLowerCase()!==binding.tenantId.toLowerCase() ||
        authorized.empresaId.toLowerCase()!==binding.empresaId.toLowerCase()) {
        throw new Error('sse_scope_not_authorized');
    }
    return Object.freeze({userId:authorized.userId.toLowerCase(),tenantId:authorized.tenantId.toLowerCase(),
        empresaId:authorized.empresaId.toLowerCase(),cameraId});
}
function fail(response,status,code){
    if (response.headersSent || response.writableEnded || response.destroyed) {
        if (!response.writableEnded && !response.destroyed) response.end();
        return false;
    }
    const body=JSON.stringify({error:code});
    response.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
        'x-content-type-options':'nosniff','content-length':Buffer.byteLength(body)});
    response.end(body);
    return false;
}
function isResync(error){return error instanceof Error && RESYNC.test(error.message);}

export function createOperationalV2RecoverableSseController({
    authorizationAdapter,getCameraBinding,queryJournal,cursorCodec,
    pageSize=100,maxPages=3,acknowledgeLegacy=false,revocationFence=null,requireRevocationFence=false
}={}){
    if (!authorizationAdapter || typeof authorizationAdapter.createGuard!=='function' ||
        typeof getCameraBinding!=='function' || typeof queryJournal!=='function' ||
        !cursorCodec || typeof cursorCodec.encode!=='function' || typeof cursorCodec.decode!=='function' ||
        !Number.isInteger(pageSize) || pageSize<1 || pageSize>100 ||
        !Number.isInteger(maxPages) || maxPages<1 || maxPages>10 ||
        typeof acknowledgeLegacy!=='boolean' || typeof requireRevocationFence!=='boolean' ||
        (requireRevocationFence && (!revocationFence || typeof revocationFence.acquire!=='function' ||
            typeof revocationFence.isCurrent!=='function')) ||
        (!requireRevocationFence && revocationFence!==null)) {
        throw new TypeError('trusted_sse_acl_reader_cursor_dependencies_required');
    }

    async function handle(request,response,{cameraId}={}){
        if (request?.method!=='GET') return fail(response,405,'method_not_allowed');
        if (request.headers?.origin) return fail(response,403,'origin_not_allowed');
        if (typeof cameraId!=='string' || !CAMERA.test(cameraId)) return fail(response,404,'not_found');
        if (typeof request.url!=='string' || request.url.includes('?') || request.url.includes('#') ||
            (request.headers?.['last-event-id']!==undefined && typeof request.headers['last-event-id']!=='string')) {
            return fail(response,400,'invalid_request');
        }
        let guard,scope,reader,cursor='0';
        try {
            guard=authorizationAdapter.createGuard({request,cameraId});
            scope=normalize(await guard.authorize(),await getCameraBinding(cameraId),cameraId);
            // Trust only a guard bound to the initial JWT and user RPC/ACL.
            if (typeof guard.revalidate!=='function') throw new Error('sse_guard_unavailable');
        }catch{return fail(response,401,'unauthorized');}
        const keepAuthorized=async()=>{
            if ((await guard.revalidate())!==true) throw new Error('sse_session_revoked');
            const binding=await getCameraBinding(cameraId);
            normalize(scope,binding,cameraId);
        };
        try {
            const raw=request.headers?.['last-event-id'];
            if (raw!==undefined && raw!=='') cursor=cursorCodec.decode(raw,scope);
        }catch{return fail(response,400,'invalid_last_event_id');}
        reader=createOperationalV2RecoverableJournalReader({
            query:queryJournal,
            getAuthorizedScope:async()=>{
                await keepAuthorized();
                return Object.freeze({tenantId:scope.tenantId,empresaId:scope.empresaId,cameraId,authorized:true});
            }
        });
        let first;
        try {
            first=await reader.readPage({afterSequence:cursor,limit:pageSize,acknowledgeLegacy});
            await keepAuthorized();
        }catch(error){
            if (isResync(error)) return fail(response,409,'resync_required');
            if (/revoked|not_authorized|unauthorized/i.test(error?.message??'')) return fail(response,403,'forbidden');
            return fail(response,503,'journal_unavailable');
        }
        let closed=false, pages=0, page=first;
        const close=()=>{
            if (closed) return;
            closed=true;
            if (!response.writableEnded && !response.destroyed) response.end();
        };
        try {
            if (request.aborted || response.destroyed || response.writableEnded) return false;
            response.once?.('close',()=>{closed=true});
            request.once?.('aborted',close);
            response.writeHead(200,{'content-type':'text/event-stream; charset=utf-8',
                'cache-control':'no-store, no-transform','x-content-type-options':'nosniff',
                'x-accel-buffering':'no','content-security-policy':"default-src 'none'"});
            if (response.write(': connected\n\n')===false) {close();return false;}
            while (!closed && pages<maxPages) {
                pages++;
                for (const event of page.events){
                    if (closed || request.aborted || response.destroyed) {close();return false;}
                    await keepAuthorized();
                    if (event.cameraId!==cameraId || event.tenantId!==scope.tenantId ||
                        event.empresaId!==scope.empresaId || event.accepted!==false ||
                        !['NO_FACE','MULTIPLE_FACES'].includes(event.status)) {
                        throw new Error('untrusted_sse_event');
                    }
                    // B5-B2: The *new fenced entrypoint* requires a trusted provider.
                    // acquire() revalidates device + user + camera + tenant eligibility and
                    // binds a revision to this precise event (not just a cached page).
                    // No network/async step may occur between the final synchronous
                    // isCurrent() check and response.write(). This blocks revocations
                    // already observed by the local fencing authority at that boundary.
                    // It is NOT an atomic database-to-HTTP guarantee across processes.
                    let fenceProof;
                    if (requireRevocationFence) {
                        const minimalEvent=Object.freeze({deviceId:event.deviceId,eventId:event.eventId,
                            cameraId:event.cameraId,tenantId:event.tenantId,empresaId:event.empresaId,
                            streamSequence:event.streamSequence});
                        fenceProof=await revocationFence.acquire(Object.freeze({scope,event:minimalEvent}));
                        if (!fenceProof || typeof fenceProof!=='object' || Array.isArray(fenceProof) ||
                            fenceProof.authorized!==true || typeof fenceProof.version!=='string' ||
                            !/^[A-Za-z0-9_-]{1,64}$/.test(fenceProof.version) ||
                            fenceProof.userId!==scope.userId || fenceProof.tenantId!==scope.tenantId ||
                            fenceProof.empresaId!==scope.empresaId || fenceProof.cameraId!==cameraId ||
                            fenceProof.deviceId!==event.deviceId || fenceProof.eventId!==event.eventId) {
                            throw new Error('sse_revocation_fence_denied');
                        }
                        // Revalidate the original JWT/RPC/ACL after any asynchronous
                        // fence acquisition; a stale response is never sufficient.
                        await keepAuthorized();
                    }
                    const id=cursorCodec.encode(scope,event.streamSequence);
                    const frame=`id: ${id}\ndata: ${JSON.stringify({accepted:false,status:event.status})}\n\n`;
                    if (requireRevocationFence) {
                        // Contract: isCurrent MUST be synchronous, monotonic and
                        // server-trusted; a Promise or undefined is denied by !==true.
                        // The future real transport must ensure all revocations are
                        // reflected at this local boundary before resuming writes.
                        if (revocationFence.isCurrent(Object.freeze({proof:fenceProof,scope,
                            event:Object.freeze({deviceId:event.deviceId,eventId:event.eventId,
                                cameraId:event.cameraId,tenantId:event.tenantId,
                                empresaId:event.empresaId,streamSequence:event.streamSequence})}))!==true) {
                            throw new Error('sse_revocation_fence_stale');
                        }
                    }
                    if (response.write(frame)===false) {close();return false;}
                    cursor=event.streamSequence;
                }
                if (!page.hasMore) break;
                if (page.events.length===0 || cursor!==page.nextSequence) throw new Error('sse_page_progress_inconsistent');
                page=await reader.readPage({afterSequence:cursor,limit:pageSize,acknowledgeLegacy});
                await keepAuthorized();
            }
            close();
            return true;
        }catch(error){
            // Never continue streaming after RPC/ACL, scope or SQL failure.
            // A resync control frame has no id and must be handled explicitly
            // by the trusted downstream client (not silently skipped).
            if (!closed && isResync(error)) {
                try {await keepAuthorized();response.write('event: resync-required\ndata: {"error":"resync_required"}\n\n');}
                catch{/* no more bytes after revocation */}
            }
            close();
            return false;
        }
    }
    return Object.freeze({handle});
}

/** B5-B2 security entrypoint: intentionally refuses to start without a
 * synchronous, trusted revocation fence. This is the ONLY factory eligible
 * for a future mounted SSE route. B4-D legacy factory remains UNMOUNTED for
 * preserved offline regression tests and MUST NOT be exposed as an endpoint.
 */
export function createOperationalV2FencedSseController(options={}) {
    return createOperationalV2RecoverableSseController({...options,requireRevocationFence:true});
}
