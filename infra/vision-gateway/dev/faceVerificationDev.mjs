// DEMO-01B: comparacao 1:1 experimental DEV, sem decisao de identidade.
import { setTimeout as delay } from 'node:timers/promises';
import { resizeBgrNearest } from './facePresenceDev.mjs';
import { alignFace } from '../src/alignment/faceAlignment.mjs';

const POLICY = {
  paddingRatio: 0.2,
  minFaceSizePx: 36,
  minVisibleAreaRatio: 0.65,
  maxRmsError: 20,
};
const TTL_MS = 120000;
const FRESH_MS = 10000;

export function createFaceVerificationDevMonitor({
  runtime, cameraId, yunetModelPath, sfaceModelPath,
  now = () => Date.now(),
  createDetector = async options =>
    (await import('../src/detection/yunetDetector.mjs')).createYunetDetector(options),
  createExtractor = async options =>
    (await import('../src/recognition/sfaceEmbedding.mjs')).createSfaceEmbeddingExtractor(options),
  loadMath = async () => import('../src/recognition/sfaceEmbedding.mjs'),
  align = alignFace,
  intervalMs = 2500,
} = {}) {
  if (!runtime?.rtspSessions || !cameraId || !yunetModelPath || !sfaceModelPath ||
      !Number.isSafeInteger(intervalMs) || intervalMs < 1000 || intervalMs > 10000) {
    throw new Error('SAFE_STOP_DEMO01B_CONFIGURATION');
  }

  let detector = null;
  let extractor = null;
  let controller = null;
  let task = null;
  let closed = false;
  let presence = 'INITIALIZING';
  let phase = 'INITIALIZING';
  let count = 0;
  let confidence = 0;
  let sampledAt = null;
  let reference = null;
  let capturedAt = null;
  let noFaceSince = null;

  function clearReference() {
    if (reference instanceof Float32Array) reference.fill(0);
    reference = null;
  }

  function expire() {
    if (capturedAt !== null && now() - capturedAt >= TTL_MS) {
      clearReference();
      capturedAt = null;
      phase = 'EXPIRED';
    }
  }

  function snapshot() {
    const fresh = sampledAt !== null && now() >= sampledAt && now() - sampledAt < FRESH_MS;
    if (closed) return {
      status: 'UNAVAILABLE', faceCount: 0, maxConfidence: 0, updatedAt: null
    };
    if (!fresh && (presence === 'FACE_DETECTED' || presence === 'NO_FACE')) {
      return {
        status: 'STALE', faceCount: 0, maxConfidence: 0, updatedAt: null
      };
    }
    return {
      status: presence,
      faceCount: presence === 'FACE_DETECTED' ? count : 0,
      maxConfidence: presence === 'FACE_DETECTED' ? confidence : 0,
      updatedAt: fresh && ['FACE_DETECTED', 'NO_FACE'].includes(presence)
        ? new Date(sampledAt).toISOString() : null,
    };
  }

  function verificationSnapshot() {
    if (closed) return { status: 'UNAVAILABLE' };
    expire();
    return { status: phase };
  }

  async function run(signal) {
    try {
      const recognition = await loadMath();
      if (!Array.isArray(recognition?.SFACE_CANONICAL_LANDMARKS_112) ||
          typeof recognition?.cosineSimilarity128 !== 'function') {
        throw new Error('SAFE_STOP_DEMO01B_MATH');
      }

      detector = await createDetector({ modelPath: yunetModelPath });
      if (typeof detector?.detectBgr !== 'function' ||
          typeof detector?.release !== 'function') {
        throw new Error('SAFE_STOP_DEMO01B_YUNET');
      }

      extractor = await createExtractor({ modelPath: sfaceModelPath });
      if (typeof extractor?.extractBgr112 !== 'function' ||
          typeof extractor?.release !== 'function') {
        throw new Error('SAFE_STOP_DEMO01B_SFACE');
      }

      phase = 'WAITING_FOR_FACE';
      presence = 'WAITING_FOR_FRAMES';

      while (!signal.aborted) {
        expire();
        const session = runtime.rtspSessions.get(cameraId);
        const geometry = session?.snapshot?.()?.frames;
        const bytes = session?.takeLatestFrame?.();

        if (bytes instanceof Uint8Array &&
            Number.isSafeInteger(geometry?.width) &&
            Number.isSafeInteger(geometry?.height) &&
            geometry.width > 0 && geometry.height > 0 &&
            bytes.length === geometry.width * geometry.height * 3) {

          const input = resizeBgrNearest(bytes, geometry.width, geometry.height);
          const faces = await detector.detectBgr({
            data: input, width: 640, height: 360
          });

          if (!Array.isArray(faces) || faces.length > 20 ||
              faces.some(face => !Number.isFinite(face?.score) ||
                face.score < 0 || face.score > 1)) {
            throw new Error('SAFE_STOP_DEMO01B_DETECTOR_RESULT');
          }

          if (signal.aborted) break;

          count = faces.length;
          confidence = count
            ? Math.round(Math.max(...faces.map(x => x.score)) * 1000) / 1000
            : 0;
          sampledAt = now();
          presence = count ? 'FACE_DETECTED' : 'NO_FACE';

          // Duas capturas distintas: ausencia do rosto por pelo menos 5s.
          if (phase === 'REFERENCE_READY') {
            if (count === 0) {
              if (noFaceSince === null) noFaceSince = now();

              if (now() - noFaceSince >= 5000) {
                phase = 'WAITING_FOR_RETURN';
              }
            } else {
              noFaceSince = null;
            }
          }

          if (count === 1 &&
              (phase === 'WAITING_FOR_FACE' || phase === 'WAITING_FOR_RETURN')) {
            let embedding = null;

            try {
              const aligned = align({
                data: input,
                width: 640,
                height: 360,
                detection: faces[0],
                targetWidth: 112,
                targetHeight: 112,
                templateLandmarks: recognition.SFACE_CANONICAL_LANDMARKS_112,
                ...POLICY,
              });

              embedding = await extractor.extractBgr112({
                data: aligned.data,
                width: aligned.width,
                height: aligned.height,
              });

              if (!(embedding instanceof Float32Array) ||
                  embedding.length !== 128 ||
                  !embedding.every(Number.isFinite)) {
                throw new Error('SAFE_STOP_DEMO01B_EMBEDDING');
              }

              if (signal.aborted) break;

              if (reference === null) {
                reference = new Float32Array(embedding);
                capturedAt = now();
                phase = 'REFERENCE_READY';
              } else {
                const score = recognition.cosineSimilarity128(
                  reference, embedding
                );

                if (!Number.isFinite(score) || score < -1 || score > 1) {
                  throw new Error('SAFE_STOP_DEMO01B_SIMILARITY');
                }

                clearReference();
                phase = 'COMPARISON_COMPLETE';
              }
            } finally {
              if (embedding instanceof Float32Array) embedding.fill(0);
            }
          }
        } else if (sampledAt === null || now() - sampledAt >= FRESH_MS) {
          presence = 'WAITING_FOR_FRAMES';
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
        phase = 'ERROR';
        presence = 'ERROR';
        clearReference();
      }
    } finally {
      clearReference();

      if (extractor) {
        try { await extractor.release(); }
        catch { phase = 'ERROR'; }
      }

      if (detector) {
        try { await detector.release(); }
        catch { phase = 'ERROR'; }
      }
    }
  }

  function start() {
    if (closed || task) return false;
    controller = new AbortController();
    task = run(controller.signal);
    return true;
  }

  async function stop() {
    if (closed) return true;
    closed = true;
    controller?.abort();
    if (task) await task;
    clearReference();
    capturedAt = null;
    phase = 'UNAVAILABLE';
    return true;
  }

  return Object.freeze({
    start, stop, snapshot, verificationSnapshot
  });
}