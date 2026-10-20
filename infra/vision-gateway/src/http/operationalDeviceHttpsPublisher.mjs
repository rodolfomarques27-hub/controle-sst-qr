import { createHash, createHmac, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CAMERA_ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const DEVICE_ID = /^[A-Za-z0-9_.:-]{1,160}$/;
const STATUSES = new Set(['NO_FACE', 'MULTIPLE_FACES']);
const PATH = '/api/camera-ia/devices/events';
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

function requireUuid(value, name) {
    if (typeof value !== 'string' || !UUID.test(value)) {
        throw new TypeError(`${name}_invalid`);
    }
    return value.toLowerCase();
}

function validateEndpoint(value) {
    if (typeof value !== 'string' || value !== value.trim()) {
        throw new TypeError('endpoint_invalid');
    }
    let url;
    try {
        url = new URL(value);
    } catch {
        throw new TypeError('endpoint_invalid');
    }
    if (
        url.protocol !== 'https:' ||
        url.pathname !== PATH ||
        url.search !== '' ||
        url.hash !== '' ||
        url.username !== '' ||
        url.password !== '' ||
        url.port !== '' ||
        !url.hostname.includes('.') ||
        url.hostname === 'localhost' ||
        url.hostname.endsWith('.localhost') ||
        url.hostname.endsWith('.local') ||
        url.hostname.endsWith('.internal') ||
        isIP(url.hostname) !== 0
    ) {
        throw new TypeError('https_public_endpoint_required');
    }
    return url.href;
}

function decodeDeviceKey(value) {
    if (typeof value !== 'string' || value.length > 256) {
        throw new TypeError('device_key_invalid');
    }
    const key = Buffer.from(value, 'base64');
    if (key.length < 32 || key.length > 64 || key.toString('base64') !== value) {
        throw new TypeError('device_key_invalid');
    }
    return key;
}

export function createOperationalDeviceHttpsPublisher({
    endpointUrl,
    deviceId,
    cameraId,
    tenantId,
    empresaId,
    deviceSecretBase64,
    getTrustedCameraBinding,
    fetchImpl = globalThis.fetch,
    pauseImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
    nowImpl = Date.now,
    nonceImpl = randomUUID,
    timeoutMs = 5000,
    maxAttempts = 3,
    retryDelayMs = 200,
} = {}) {
    const endpoint = validateEndpoint(endpointUrl);
    if (typeof deviceId !== 'string' || !DEVICE_ID.test(deviceId)) {
        throw new TypeError('device_id_invalid');
    }
    if (typeof cameraId !== 'string' || !CAMERA_ID.test(cameraId)) {
        throw new TypeError('camera_id_invalid');
    }
    const boundTenantId = requireUuid(tenantId, 'tenant_id');
    const boundEmpresaId = requireUuid(empresaId, 'empresa_id');
    const key = decodeDeviceKey(deviceSecretBase64);
    if (
        typeof getTrustedCameraBinding !== 'function' ||
        typeof fetchImpl !== 'function' ||
        typeof pauseImpl !== 'function' ||
        typeof nowImpl !== 'function' ||
        typeof nonceImpl !== 'function' ||
        !Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 30000 ||
        !Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5 ||
        !Number.isSafeInteger(retryDelayMs) || retryDelayMs < 0 || retryDelayMs > 5000
    ) {
        throw new TypeError('publisher_configuration_invalid');
    }

    let closed = false;
    let initialized = false;
    let lastFrames = -1;
    let lastDeliveredStatus = null;
    let queued = 0;
    let tail = Promise.resolve();
    let activeController = null;

    async function bindingMatches() {
        try {
            const binding = await getTrustedCameraBinding(cameraId);
            return Boolean(
                binding && typeof binding === 'object' && !Array.isArray(binding) &&
                binding.cameraId === cameraId &&
                typeof binding.tenantId === 'string' &&
                typeof binding.empresaId === 'string' &&
                requireUuid(binding.tenantId, 'tenant_id') === boundTenantId &&
                requireUuid(binding.empresaId, 'empresa_id') === boundEmpresaId
            );
        } catch {
            return false;
        }
    }

    async function sendEvent(event) {
        const body = JSON.stringify(event);
        const digest = createHash('sha256').update(body, 'utf8').digest('hex');
        for (let attempt = 0; attempt < maxAttempts && !closed; attempt += 1) {
            if (attempt > 0) {
                await pauseImpl(Math.min(retryDelayMs * (2 ** (attempt - 1)), 5000));
                if (closed || !(await bindingMatches())) return false;
            }

            const epochSeconds = Math.floor(nowImpl() / 1000);
            const nonce = nonceImpl();
            if (
                !Number.isSafeInteger(epochSeconds) || epochSeconds <= 0 ||
                typeof nonce !== 'string' || !UUID.test(nonce)
            ) {
                return false;
            }
            const canonical = `${epochSeconds}\n${nonce}\n${digest}\n${PATH}`;
            const signature = createHmac('sha256', key).update(canonical, 'utf8').digest('base64url');
            const controller = new AbortController();
            activeController = controller;
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            timer.unref?.();
            let retry;
            try {
                const response = await fetchImpl(endpoint, {
                    method: 'POST',
                    headers: {
                        'content-type': 'application/json',
                        'accept': 'application/json',
                        'x-safescan-device-id': deviceId,
                        'x-safescan-event-id': event.eventId,
                        'x-safescan-timestamp': String(epochSeconds),
                        'x-safescan-nonce': nonce,
                        'x-safescan-signature': signature,
                    },
                    body,
                    cache: 'no-store',
                    redirect: 'error',
                    credentials: 'omit',
                    signal: controller.signal,
                });
                if (!closed && [202, 204].includes(response?.status) && response.ok === true) {
                    return true;
                }
                retry = RETRYABLE.has(response?.status);
            } catch {
                retry = !closed;
            } finally {
                clearTimeout(timer);
                if (activeController === controller) activeController = null;
            }
            if (!retry) return false;
        }
        return false;
    }

    function publishSnapshot({ processedFrames, lastResult } = {}) {
        if (
            closed ||
            !Number.isSafeInteger(processedFrames) || processedFrames < 0 ||
            !lastResult || typeof lastResult !== 'object' || Array.isArray(lastResult) ||
            !STATUSES.has(lastResult.status) ||
            (Object.hasOwn(lastResult, 'accepted') && lastResult.accepted !== false)
        ) {
            return Promise.resolve(false);
        }
        if (!initialized) {
            initialized = true;
            lastFrames = processedFrames;
            lastDeliveredStatus = lastResult.status;
            return Promise.resolve(false);
        }
        if (processedFrames <= lastFrames) return Promise.resolve(false);
        lastFrames = processedFrames;
        if (queued >= 8) return Promise.resolve(false);
        const status = lastResult.status;
        queued += 1;

        const result = tail.then(async () => {
            if (closed || status === lastDeliveredStatus || !(await bindingMatches())) {
                return false;
            }
            // No raw frame or biometric fields enter the payload.
            const event = Object.freeze({
                version: 1,
                eventId: randomUUID(),
                deviceId,
                cameraId,
                tenantId: boundTenantId,
                empresaId: boundEmpresaId,
                accepted: false,
                status,
            });
            const delivered = await sendEvent(event);
            if (delivered) lastDeliveredStatus = status;
            return delivered;
        }).catch(() => false).finally(() => {
            queued -= 1;
        });
        tail = result.then(() => undefined);
        return result;
    }

    function close() {
        closed = true;
        activeController?.abort();
    }

    return Object.freeze({ publishSnapshot, close });
}
