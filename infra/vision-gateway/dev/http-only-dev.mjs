import { createGatewayRuntime } from '../src/index.mjs';
import { createHealthServer } from '../src/http/healthServer.mjs';
import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFacePresenceDevMonitor } from './facePresenceDev.mjs';
import { createFaceVerificationDevMonitor } from './faceVerificationDev.mjs';
import { createPpePresenceDevMonitor } from './ppePresenceDev.mjs';

const rawPort = process.env.SAFESCAN_DEV_GATEWAY_PORT;

if (!/^[0-9]{4,5}$/.test(rawPort ?? '')) {
  throw new Error('SAFE_STOP_HTTP_ONLY_PORT_REQUIRED');
}

const port = Number(rawPort);

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('SAFE_STOP_HTTP_ONLY_PORT_INVALID');
}

const runtime = createGatewayRuntime({ env: process.env });
const cameraEnabled = process.env.SAFESCAN_DEV_ENABLE_CAMERA === '1';
if (cameraEnabled && !runtime.config.camera?.id) {
  throw new Error('SAFE_STOP_CAMERA_CONFIG_REQUIRED');
}
const faceEnabled = process.env.SAFESCAN_DEV_ENABLE_FACE_DETECTION === '1';
if (faceEnabled && (
  !cameraEnabled ||
  process.env.SAFESCAN_VISION_RTSP_INPUT_MODE !== 'go2rtc_local'
)) {
  throw new Error('SAFE_STOP_FACE_LOCAL_RELAY_REQUIRED');
}
const verifyEnabled = process.env.SAFESCAN_DEV_ENABLE_FACE_VERIFICATION === '1';
if (verifyEnabled && !faceEnabled) throw new Error('SAFE_STOP_DEMO01B_FACE_FLAG_REQUIRED');
const faceMonitor = faceEnabled ? (verifyEnabled ? createFaceVerificationDevMonitor({
  runtime, cameraId: runtime.config.camera.id,
  yunetModelPath: fileURLToPath(new URL('../models/face_detection_yunet_2026may.onnx', import.meta.url)),
  sfaceModelPath: fileURLToPath(new URL('../models/face_recognition_sface_2021dec.onnx', import.meta.url)),
}) : createFacePresenceDevMonitor({
  runtime,
  cameraId: runtime.config.camera.id,
  modelPath: fileURLToPath(new URL('../models/face_detection_yunet_2026may.onnx', import.meta.url)),
})) : null;

const ppeEnabled =
  process.env.SAFESCAN_DEV_ENABLE_PPE_DETECTION === '1';

let ppeModelPath = null;

if (ppeEnabled) {
  if (
    !cameraEnabled ||
    process.env.SAFESCAN_VISION_RTSP_INPUT_MODE !== 'go2rtc_local'
  ) {
    throw new Error('SAFE_STOP_PPE_LOCAL_RELAY_REQUIRED');
  }

  const rawPpeModelPath =
    String(
      process.env.SAFESCAN_PPE_MODEL_PATH ?? ''
    ).trim();

  if (!rawPpeModelPath || rawPpeModelPath.includes('\0')) {
    throw new Error('SAFE_STOP_PPE_MODEL_PATH_REQUIRED');
  }

  ppeModelPath =
    resolve(rawPpeModelPath);

  const repoRoot =
    resolve(
      fileURLToPath(
        new URL('../../..', import.meta.url)
      )
    );

  const modelRelativeToRepo =
    relative(
      repoRoot,
      ppeModelPath
    );

  const modelOutsideRepo =
    modelRelativeToRepo === '..' ||
    modelRelativeToRepo.startsWith(`..${sep}`) ||
    isAbsolute(modelRelativeToRepo);

  if (!modelOutsideRepo) {
    throw new Error('SAFE_STOP_PPE_MODEL_MUST_BE_EXTERNAL');
  }

  if (!existsSync(ppeModelPath)) {
    throw new Error('SAFE_STOP_PPE_MODEL_NOT_FOUND');
  }
}

const ppeMonitor =
  ppeEnabled
    ? createPpePresenceDevMonitor({
        runtime,
        cameraId:
          runtime.config.camera.id,
        modelPath:
          ppeModelPath,
      })
    : null;

const host = '127.0.0.1';

const HEALTH = new Set(['ONLINE', 'DEGRADED', 'OFFLINE']);
const SESSION = new Set([
  'STARTING', 'RUNNING', 'STOPPING', 'STOPPED', 'RECONNECTING'
]);

function getOperationalSnapshot() {
  const source = runtime.getSnapshot();
  const cameras = Array.isArray(source?.cameras) ? source.cameras : [];

  const observed = cameras.map(camera => {
    const health = camera?.health;
    const rtsp = camera?.rtsp;

    const healthStatus = HEALTH.has(health?.status)
      ? health.status : 'UNKNOWN';

    const sessionState = SESSION.has(rtsp?.state)
      ? rtsp.state : 'NOT_STARTED';

    const lastFrame = Number.isSafeInteger(rtsp?.lastFrame) &&
      rtsp.lastFrame >= 0 ? rtsp.lastFrame : 0;

    const lastFrameMs = Date.parse(health?.lastFrameAt ?? '');

    const recent = Number.isFinite(lastFrameMs) &&
      Date.now() >= lastFrameMs &&
      Date.now() - lastFrameMs <= 10000 &&
      rtsp?.running === true &&
      rtsp?.firstFrameSeen === true;

    return {
      healthStatus,
      sessionState,
      sessionRunning: rtsp?.running === true,
      firstFrameSeen: rtsp?.firstFrameSeen === true,
      lastFrameCount: lastFrame,
      recentFrames: recent,
      reconnectScheduled: rtsp?.reconnectScheduled === true,
    };
  });

  const state = observed.length === 0
    ? 'NO_CAMERA_CONFIGURED'
    : observed.some(camera => camera.recentFrames)
      ? 'FRAMES_RECENT'
      : observed.some(camera => camera.sessionRunning)
        ? 'SESSION_NO_RECENT_FRAMES'
        : 'NO_ACTIVE_SESSION';

  return {
    service: 'safescan-vision-gateway',
    mode: 'READ_ONLY_DEV',
    status: state,
    cameraCount: observed.length,
    cameras: observed,
    ...(faceMonitor ? {
      faceDetection: state === 'FRAMES_RECENT'
        ? faceMonitor.snapshot()
        : { status: 'STALE', faceCount: 0, maxConfidence: 0, updatedAt: null },
    } : {}),
    ...(verifyEnabled && faceMonitor ? {
      faceVerification: state === 'FRAMES_RECENT'
        ? faceMonitor.verificationSnapshot() : { status: 'UNAVAILABLE' },
    } : {}),
    ...(ppeMonitor ? {
      ppeDetection: state === 'FRAMES_RECENT'
        ? ppeMonitor.snapshot()
        : {
            status: 'STALE',
            personCount: 0,
            counts: {
              hardhat: 0,
              noHardhat: 0,
              vest: 0,
              noVest: 0,
              person: 0,
            },
            maxConfidence: {
              hardhat: 0,
              noHardhat: 0,
              vest: 0,
              noVest: 0,
              person: 0,
            },
            updatedAt: null,
          },
    } : {}),
  };
}

const health = createHealthServer({
  host,
  port,
  getSnapshot: getOperationalSnapshot,
  getBiometricSnapshot: null,
});

let stopping = false;

async function shutdown() {
  if (stopping) return;
  stopping = true;

  try {
    if (ppeMonitor) await ppeMonitor.stop();
    if (faceMonitor) await faceMonitor.stop();
    if (cameraEnabled) runtime.stopCamera(runtime.config.camera.id);
    await health.stop();
    process.stdin.pause();
    process.stdout.write('HTTP_ONLY_STOPPED=GREEN\n');
  } catch {
    process.stderr.write('SAFE_STOP_HTTP_ONLY_SHUTDOWN\n');
    process.exitCode = 1;
  }
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
process.stdin.setEncoding('utf8');
process.stdin.on('data', value => {
  if (value.trim() === 'STOP') void shutdown();
});
process.stdin.on('end', () => void shutdown());
process.stdin.resume();

try {
  await health.start();
  if (cameraEnabled) {
    if (faceMonitor || ppeMonitor) {
      await runtime.startCamera(runtime.config.camera.id);

      if (faceMonitor) {
        faceMonitor.start();
      }

      if (ppeMonitor) {
        ppeMonitor.start();
      }
    } else {
      runtime.startCamera(runtime.config.camera.id);
    }

    process.stdout.write('CAMERA_START_REQUESTED=TRUE\n');

    if (ppeMonitor) {
      process.stdout.write('PPE_MONITOR_START_REQUESTED=TRUE\n');
    }
  }
  process.stdout.write('HTTP_ONLY_LISTENING=GREEN\n');
} catch {
  process.stderr.write('SAFE_STOP_HTTP_ONLY_START\n');
  process.exitCode = 1;
  await shutdown();
}