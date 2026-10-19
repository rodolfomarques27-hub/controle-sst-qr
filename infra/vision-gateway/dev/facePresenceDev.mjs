// SafeScan Brasil — isolated, opt-in DEV-only face-presence inference.
// No SFace, identity reference, embedding, frame storage or access decision.
import { setTimeout as delay } from 'node:timers/promises';

export function resizeBgrNearest(data, width, height, outWidth = 640, outHeight = 360) {
  if (!(data instanceof Uint8Array) ||
      !Number.isSafeInteger(width) || width <= 0 ||
      !Number.isSafeInteger(height) || height <= 0 ||
      data.length !== width * height * 3) {
    throw new TypeError('INVALID_BGR_FRAME');
  }
  const resized = new Uint8Array(outWidth * outHeight * 3);
  for (let y = 0; y < outHeight; y++) {
    const sourceY = Math.floor(y * height / outHeight);
    for (let x = 0; x < outWidth; x++) {
      const sourceX = Math.floor(x * width / outWidth);
      const sourceIndex = (sourceY * width + sourceX) * 3;
      const targetIndex = (y * outWidth + x) * 3;
      resized[targetIndex] = data[sourceIndex];
      resized[targetIndex + 1] = data[sourceIndex + 1];
      resized[targetIndex + 2] = data[sourceIndex + 2];
    }
  }
  return resized;
}

export function createFacePresenceDevMonitor({
  runtime,
  cameraId,
  modelPath,
  createDetector = async options => {
    const { createYunetDetector } = await import('../src/detection/yunetDetector.mjs');
    return createYunetDetector(options);
  },
  now = () => Date.now(),
  intervalMs = 2500,
  freshForMs = 10000,
} = {}) {
  if (!runtime?.rtspSessions || !cameraId || !modelPath ||
      !Number.isInteger(intervalMs) || intervalMs < 1000 || intervalMs > 10000) {
    throw new TypeError('INVALID_FACE_PRESENCE_CONFIGURATION');
  }

  let state = 'INITIALIZING';
  let count = 0;
  let confidence = 0;
  let sampledAt = null;
  let task = null;
  let abort = null;
  let closed = false;

  function snapshot() {
    const age = sampledAt === null ? Infinity : now() - sampledAt;
    if (closed || state === 'STOPPED') {
      return { status: 'UNAVAILABLE', faceCount: 0, maxConfidence: 0, updatedAt: null };
    }
    if ((state === 'FACE_DETECTED' || state === 'NO_FACE') &&
        (age < 0 || age > freshForMs)) {
      return { status: 'STALE', faceCount: 0, maxConfidence: 0, updatedAt: null };
    }
    return {
      status: state,
      faceCount: state === 'FACE_DETECTED' ? count : 0,
      maxConfidence: state === 'FACE_DETECTED' ? confidence : 0,
      updatedAt: state === 'FACE_DETECTED' || state === 'NO_FACE'
        ? new Date(sampledAt).toISOString() : null,
    };
  }

  async function run(signal) {
    let detector;
    try {
      detector = await createDetector({ modelPath });
      if (typeof detector?.detectBgr !== 'function' ||
          typeof detector?.release !== 'function') {
        throw new TypeError('INVALID_YUNET_DETECTOR');
      }
      state = 'WAITING_FOR_FRAMES';
      while (!signal.aborted) {
        const session = runtime.rtspSessions.get(cameraId);
        const geometry = session?.snapshot?.()?.frames;
        const bytes = session?.takeLatestFrame?.();
        if (bytes && Number.isSafeInteger(geometry?.width) &&
            Number.isSafeInteger(geometry?.height) &&
            bytes instanceof Uint8Array &&
            bytes.length === geometry.width * geometry.height * 3) {
          const input = resizeBgrNearest(bytes, geometry.width, geometry.height);
          const faces = await detector.detectBgr({ data: input, width: 640, height: 360 });
          if (!Array.isArray(faces) || faces.length > 20 ||
              faces.some(face => !Number.isFinite(face?.score) ||
                face.score < 0 || face.score > 1)) {
            throw new TypeError('INVALID_YUNET_OUTPUT');
          }
          if (!signal.aborted) {
            count = faces.length;
            confidence = faces.length === 0 ? 0 :
              Math.round(Math.max(...faces.map(face => face.score)) * 1000) / 1000;
            sampledAt = now();
            state = faces.length > 0 ? 'FACE_DETECTED' : 'NO_FACE';
          }
        } else if (sampledAt === null || now() - sampledAt > freshForMs) {
          state = 'WAITING_FOR_FRAMES';
          count = 0;
          confidence = 0;
          sampledAt = null;
        }
        try {
          await delay(intervalMs, undefined, { signal });
        } catch (error) {
          if (!signal.aborted) throw error;
        }
      }
    } catch {
      if (!signal.aborted) {
        state = 'ERROR';
        count = 0;
        confidence = 0;
        sampledAt = null;
      }
    } finally {
      if (detector) {
        try { await detector.release(); }
        catch { state = 'ERROR'; }
      }
    }
  }

  function start() {
    if (closed || task) return false;
    abort = new AbortController();
    task = run(abort.signal);
    return true;
  }

  async function stop() {
    if (closed) return true;
    closed = true;
    abort?.abort();
    if (task) await task;
    state = 'STOPPED';
    count = 0;
    confidence = 0;
    sampledAt = null;
    return true;
  }

  return Object.freeze({ start, stop, snapshot });
}
