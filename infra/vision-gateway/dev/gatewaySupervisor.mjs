import { spawn, execFile } from 'node:child_process';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createConnection } from 'node:net';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const CHILD_ENTRY = fileURLToPath(new URL('./http-only-dev.mjs', import.meta.url));
const HEALTH_URL = 'http://127.0.0.1:18573/health';
const RESTART_DELAY_MS = [2000, 5000, 15000, 30000];
const RESTART_WINDOW_MS = 5 * 60 * 1000;
const DIAGNOSTICS = new Set([
  'CHILD_EXITED', 'HEALTH_HTTP_NON_200', 'HEALTH_CONTRACT_REJECTED',
  'HEALTH_NOT_RECENT', 'HEALTH_REQUEST_FAILED',
]);

export function isStopCommand(value) {
  return typeof value === 'string' && /^(PARAR|STOP|ENCERRAR)$/i.test(value.trim());
}

// Conservative, non-destructive preflight. It is not an atomic multi-process lock.
export async function assertGatewayPortFree({
  host = '127.0.0.1',
  port = 18573,
  timeoutMs = 1500,
  connect = createConnection,
} = {}) {
  return await new Promise((resolvePort, rejectPort) => {
    let settled = false;
    const socket = connect({ host, port });
    const finish = (error) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) rejectPort(error);
      else resolvePort(true);
    };
    socket.once('connect', () => finish(new Error('SAFE_STOP_GATEWAY_PORT_IN_USE')));
    socket.once('error', (error) => {
      if (error?.code === 'ECONNREFUSED') finish();
      else finish(new Error('SAFE_STOP_GATEWAY_PORT_UNVERIFIED'));
    });
    socket.setTimeout(timeoutMs, () => finish(new Error('SAFE_STOP_GATEWAY_PORT_UNVERIFIED')));
  });
}


function safeCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export async function readHealth({ fetchHealth = fetch } = {}) {
  const response = await fetchHealth(HEALTH_URL, {
    method: 'GET',
    signal: AbortSignal.timeout(2500),
    cache: 'no-store',
  });
  if (response.status !== 200) return { framesRecent: false, count: 0, reason: 'HEALTH_HTTP_NON_200' };
  const body = await response.text();
  if (body.length > 8192) return { framesRecent: false, count: 0, reason: 'HEALTH_CONTRACT_REJECTED' };
  let data;
  try { data = JSON.parse(body); } catch { return { framesRecent: false, count: 0, reason: 'HEALTH_CONTRACT_REJECTED' }; }
  if (data?.mode !== 'READ_ONLY_DEV' || data?.status !== 'FRAMES_RECENT') {
    return { framesRecent: false, count: 0, reason: 'HEALTH_CONTRACT_REJECTED' };
  }
  const cameras = data.cameras;
  if (!Array.isArray(cameras) || cameras.length !== 1) return { framesRecent: false, count: 0, reason: 'HEALTH_CONTRACT_REJECTED' };
  const camera = cameras[0];
  const framesRecent = camera?.recentFrames === true && camera?.sessionRunning === true;
  return framesRecent
    ? { framesRecent: true, count: safeCount(camera?.lastFrameCount) }
    : { framesRecent: false, count: safeCount(camera?.lastFrameCount), reason: 'HEALTH_NOT_RECENT' };
}


// Windows: only terminate the process tree rooted at the ChildProcess spawned
// by this supervisor. Do not use image-name kills or discover unrelated PIDs.
// A parent which has already exited cannot be safely targeted by PID (reuse).
export async function terminateOwnedProcessTree(child, {
  platform = process.platform,
  exec = execFile,
} = {}) {
  if (!child || !Number.isSafeInteger(child.pid) || child.pid <= 0 ||
      child.exitCode !== null || child.signalCode !== null) return false;
  if (platform !== 'win32') {
    try { return child.kill('SIGKILL') === true; } catch { return false; }
  }
  return await new Promise(resolveKill => {
    try {
      exec('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true, timeout: 5000, maxBuffer: 8192,
      }, error => resolveKill(error === null));
    } catch { resolveKill(false); }
  });
}

export class GatewaySupervisor extends EventEmitter {
  constructor({
    launch = () => spawn(process.execPath, [CHILD_ENTRY], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['pipe', 'ignore', 'ignore'],
      windowsHide: true,
    }),
    health = readHealth,
    now = () => Date.now(),
    setDelay = setTimeout,
    clearDelay = clearTimeout,
    setPulse = setInterval,
    clearPulse = clearInterval,
    stopGraceMs = 8000,
    killTree = terminateOwnedProcessTree,
  } = {}) {
    super();
    this.deps = { launch, health, now, setDelay, clearDelay, setPulse, clearPulse, stopGraceMs, killTree };
    this.state = 'STOPPED';
    this.child = null;
    this.stopping = false;
    this.startCalled = false;
    this.restarts = [];
    this.totalRestarts = 0;
    this.retryTimer = null;
    this.pulseTimer = null;
    this.serial = 0;
    this.lastDiagnostic = null;
  }

  transition(state) {
    if (this.state !== state) {
      this.state = state;
      this.emit('state', state);
    }
  }

  diagnostic(code) {
    const safeCode = DIAGNOSTICS.has(code) ? code : 'HEALTH_CONTRACT_REJECTED';
    if (this.lastDiagnostic === safeCode) return;
    this.lastDiagnostic = safeCode;
    this.emit('diagnostic', safeCode);
  }

  start() {
    if (this.startCalled || this.stopping) throw new Error('SAFE_STOP_ALREADY_STARTED');
    this.startCalled = true;
    this.launchChild();
  }

  launchChild() {
    if (this.stopping || this.child) return;
    let child;
    try { child = this.deps.launch(); } catch { this.afterExit(); return; }
    this.child = child;
    const generation = ++this.serial;
    this.transition('STARTING');
    let settled = false;
    const done = () => {
      if (settled || this.child !== child) return;
      settled = true;
      this.child = null;
      this.stopPulse();
      if (!this.stopping) this.afterExit();
    };
    child.once('exit', done);
    child.once('error', done);
    this.pulseTimer = this.deps.setPulse(() => { void this.poll(generation); }, 5000);
    void this.poll(generation);
  }

  async poll(generation = this.serial) {
    const child = this.child;
    if (this.stopping || !child || generation !== this.serial) return;
    try {
      const result = await this.deps.health();
      if (this.stopping || this.child !== child || generation !== this.serial) return;
      if (result?.framesRecent === true) {
        this.lastDiagnostic = null;
        this.transition('RUNNING');
      } else {
        this.diagnostic(result?.reason ?? 'HEALTH_NOT_RECENT');
        this.transition('DEGRADED');
      }
      // A ausência de frames NÃO reinicia o processo: o RTSP já possui reconexão própria.
    } catch {
      if (!this.stopping && this.child === child && generation === this.serial) {
        this.diagnostic('HEALTH_REQUEST_FAILED');
        this.transition('DEGRADED');
      }
    }
  }

  stopPulse() {
    if (this.pulseTimer !== null) this.deps.clearPulse(this.pulseTimer);
    this.pulseTimer = null;
  }

  afterExit() {
    if (this.stopping) return;
    this.diagnostic('CHILD_EXITED');
    this.transition('DEGRADED');
    const now = this.deps.now();
    this.restarts = this.restarts.filter(at => now - at < RESTART_WINDOW_MS);
    if (this.restarts.length >= 3) {
      this.stopping = true;
      this.transition('STOPPED');
      this.emit('safestop', 'RESTART_LIMIT');
      return;
    }
    const delay = RESTART_DELAY_MS[Math.min(this.totalRestarts, RESTART_DELAY_MS.length - 1)];
    this.totalRestarts += 1;
    this.restarts.push(now);
    this.emit('retry', { attempt: this.restarts.length, delay });
    this.retryTimer = this.deps.setDelay(() => {
      this.retryTimer = null;
      if (!this.stopping) this.launchChild();
    }, delay);
  }

  async stop() {
    if (this.stopping && this.state === 'STOPPED') return;
    this.stopping = true;
    if (this.retryTimer !== null) this.deps.clearDelay(this.retryTimer);
    this.retryTimer = null;
    this.stopPulse();
    const child = this.child;
    if (!child) { this.transition('STOPPED'); return; }
    this.transition('STOPPING');
    const done = new Promise(resolveDone => {
      if (child.exitCode !== null || child.signalCode !== null) { resolveDone(true); return; }
      child.once('exit', () => resolveDone(true));
      child.once('error', () => resolveDone(true));
    });
    try { child.stdin?.write('STOP\n'); } catch { /* kill only our child, below */ }
    const completed = await Promise.race([
      done,
      new Promise(resolveTimeout => {
        const token = this.deps.setDelay(() => resolveTimeout(false), this.deps.stopGraceMs);
        void done.then(() => this.deps.clearDelay(token));
      }),
    ]);
    let confirmed = completed;
    let treeVerified = true;
    if (!confirmed) {
      // Forced fallback must target the owned *tree*, not only the Node parent.
      // If the tree cannot be verified, fail closed even if the parent exits.
      treeVerified = await this.deps.killTree(child);
      if (!treeVerified && child.exitCode === null && child.signalCode === null) {
        try { child.kill('SIGKILL'); } catch { /* only the owned parent */ }
      }
      confirmed = await Promise.race([done, new Promise(resolveTimeout =>
        this.deps.setDelay(() => resolveTimeout(false), 2000))]);
    }
    if (!confirmed || !treeVerified) {
      this.transition('DEGRADED');
      this.emit('safestop', treeVerified ? 'CHILD_NOT_STOPPED' : 'DESCENDANTS_UNVERIFIED');
      return false;
    }
    this.child = null;
    this.transition('STOPPED');
    return true;
  }
}

export function validateDevEnvironment(env = process.env) {
  if (env.SAFESCAN_DEV_ENABLE_CAMERA !== '1' ||
      env.SAFESCAN_DEV_GATEWAY_PORT !== '18573' ||
      env.SAFESCAN_VISION_HOST !== '127.0.0.1' ||
      env.SAFESCAN_VISION_PORT !== '18573' ||
      !env.SAFESCAN_CAMERA_PASSWORD ||
      env.SAFESCAN_CAMERA_ID !== 'sala_teste' ||
      env.SAFESCAN_CAMERA_HOST !== '192.168.15.63' || // NOSONAR - deliberate fail-closed DEV camera host pin; not a credential or production endpoint.
      env.SAFESCAN_CAMERA_PATH !== '/onvif1' ||
      env.SAFESCAN_CAMERA_PORT !== '554' ||
      env.SAFESCAN_CAMERA_TRANSPORT !== 'udp' ||
      env.SAFESCAN_CAMERA_USERNAME !== 'admin') {
    throw new Error('SAFE_STOP_DEV_ENV');
  }
  return true;
}

async function main() {
  validateDevEnvironment();
  await assertGatewayPortFree(); // Do not spawn if a Gateway already owns 18573.
  const supervisor = new GatewaySupervisor();
  const labels = new Set(['STARTING', 'RUNNING', 'DEGRADED', 'STOPPING', 'STOPPED']);
  supervisor.on('state', state => {
    if (labels.has(state)) process.stdout.write(`GATEWAY_SUPERVISOR_STATE=${state}\n`);
  });
  supervisor.on('diagnostic', code => {
    if (DIAGNOSTICS.has(code)) process.stdout.write(`GATEWAY_DIAGNOSTIC=${code}\n`);
  });
  supervisor.on('retry', value => {
    process.stdout.write(`GATEWAY_RETRY_ATTEMPT=${value.attempt};DELAY_MS=${value.delay}\n`);
  });
  supervisor.on('safestop', reason => {
    const code = reason === 'RESTART_LIMIT' ? 'RESTART_LIMIT'
      : reason === 'DESCENDANTS_UNVERIFIED' ? 'DESCENDANTS_UNVERIFIED' : 'CHILD_NOT_STOPPED';
    process.stdout.write(`SAFE_STOP_GATEWAY_${code}\n`);
    process.exitCode = 2;
    void shutdown();
  });
  let shuttingDown = false;
  async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    const stopped = await supervisor.stop();
    if (!stopped && supervisor.state !== 'STOPPED') process.exitCode = 2;
    process.stdin.pause();
  }
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (isStopCommand(chunk)) void shutdown();
  });
  process.stdin.on('end', () => void shutdown());
  process.once('SIGINT', () => void shutdown());
  process.once('SIGTERM', () => void shutdown());
  process.stdin.resume();
  supervisor.start();
}

async function selfTest() {
  const tasks = [];
  const children = [];
  class MockChild extends EventEmitter {
    constructor() {
      super();
      this.exitCode = null;
      this.signalCode = null;
      this.stdin = { write: () => { queueMicrotask(() => this.finish()); } };
    }
    finish() {
      if (this.exitCode !== null) return;
      this.exitCode = 0;
      this.emit('exit', 0, null);
    }
    kill() { this.finish(); return true; }
  }
  const factory = () => {
    const child = new MockChild();
    children.push(child);
    return child;
  };
  const supervisor = new GatewaySupervisor({
    launch: factory,
    health: async () => ({ framesRecent: true, count: 8 }),
    now: () => 100000,
    setDelay: (fn, delay) => { const timer = { fn, delay }; tasks.push(timer); return timer; },
    clearDelay: timer => { timer.cancelled = true; },
    setPulse: () => ({}),
    clearPulse: () => {},
  });
  const tick = () => new Promise(done => setImmediate(done));
  supervisor.start();
  await tick();
  assert.equal(supervisor.state, 'RUNNING');
  children[0].finish();
  assert.equal(supervisor.state, 'DEGRADED');
  const retry = tasks.pop();
  assert.equal(retry.delay, 2000);
  // Um reinício controlado, sem câmera real.
  retry.fn();
  await tick();
  assert.equal(children.length, 2);
  assert.equal(supervisor.state, 'RUNNING');
  assert.equal(await supervisor.stop(), true);
  assert.equal(supervisor.state, 'STOPPED');
  process.stdout.write('TEC01R_MOCK_START_STOP=GREEN\n');
  process.stdout.write('TEC01R_MOCK_RESTART=GREEN\n');
  const diagnosticsObserved = [];
  const degraded = new GatewaySupervisor({
    launch: factory,
    health: async () => ({ framesRecent: false }),
    setPulse: () => ({}),
    clearPulse: () => {},
  });
  degraded.on('diagnostic', code => diagnosticsObserved.push(code));
  degraded.start();
  await tick();
  assert.equal(degraded.state, 'DEGRADED');
  assert.deepEqual(diagnosticsObserved, ['HEALTH_NOT_RECENT']);
  assert.equal(await degraded.stop(), true);
  process.stdout.write('TEC01R_NO_RESTART_ON_STALE_RTSP=GREEN\n');
  let unsafeStops = 0;
  const retryTimers = [];
  const cap = new GatewaySupervisor({
    launch: factory,
    health: async () => ({ framesRecent: true }),
    now: () => 200000,
    setPulse: () => ({}),
    clearPulse: () => {},
    setDelay: (fn, delay) => { const t = { fn, delay }; retryTimers.push(t); return t; },
    clearDelay: () => {},
  });
  cap.on('safestop', reason => { if (reason === 'RESTART_LIMIT') unsafeStops++; });
  cap.start();
  for (let i = 0; i < 4; i++) {
    cap.child.finish();
    if (i < 3) {
      const timer = retryTimers.pop();
      assert.equal(timer.delay, [2000, 5000, 15000][i]);
      timer.fn();
      await tick();
    }
  }
  assert.equal(unsafeStops, 1);
  assert.equal(cap.state, 'STOPPED');
  process.stdout.write('TEC01R_MOCK_RESTART_LIMIT=GREEN\n');
  assert.throws(() => validateDevEnvironment({}), /SAFE_STOP_DEV_ENV/);
  const sample = await readHealth({ fetchHealth: async () => ({
    status: 200,
    text: async () => JSON.stringify({
      mode: 'READ_ONLY_DEV', status: 'FRAMES_RECENT',
      cameras: [{ recentFrames: true, sessionRunning: true, lastFrameCount: 42 }],
    }),
  }) });
  assert.deepEqual(sample, { framesRecent: true, count: 42 });
  process.stdout.write('TEC01R_HEALTH_ALLOWLIST=GREEN\n');
  process.stdout.write('TEC01R_ENV_GUARD=GREEN\n');
  assert.equal(isStopCommand('ENCERRAR\r\n'), true);
  assert.equal(isStopCommand('parar'), true);
  assert.equal(isStopCommand('STOP'), true);
  assert.equal(isStopCommand('OUTRO'), false);
  process.stdout.write('TEC01S_CLI_COMMANDS=GREEN\n');
  const mockedConnect = outcome => () => {
    const socket = new EventEmitter();
    socket.destroy = () => socket;
    socket.setTimeout = (_ms, onTimeout) => {
      if (outcome === 'timeout') queueMicrotask(onTimeout);
      return socket;
    };
    queueMicrotask(() => {
      if (outcome === 'used') socket.emit('connect');
      if (outcome === 'refused') {
        socket.emit('error', Object.assign(new Error('simulated'), { code: 'ECONNREFUSED' }));
      }
    });
    return socket;
  };
  assert.equal(await assertGatewayPortFree({ connect: mockedConnect('refused') }), true);
  await assert.rejects(
    assertGatewayPortFree({ connect: mockedConnect('used') }), /SAFE_STOP_GATEWAY_PORT_IN_USE/);
  await assert.rejects(
    assertGatewayPortFree({ connect: mockedConnect('timeout') }), /SAFE_STOP_GATEWAY_PORT_UNVERIFIED/);
  process.stdout.write('TEC01S_PORT_GUARD=GREEN\n');
  assert.deepEqual(diagnosticsObserved, ['HEALTH_NOT_RECENT']);
  const unhealthy = await readHealth({ fetchHealth: async () => ({ status: 503 }) });
  assert.equal(unhealthy.reason, 'HEALTH_HTTP_NON_200');
  process.stdout.write('TEC01S_DIAGNOSTICS=GREEN\n');
  const stubborn = new MockChild();
  stubborn.pid = 424242;
  stubborn.stdin = { write: () => {} };
  const treeCalled = [];
  const treeTest = new GatewaySupervisor({
    launch: () => stubborn,
    health: async () => ({ framesRecent: true, count: 1 }),
    stopGraceMs: 5,
    killTree: async child => {
      treeCalled.push(child.pid);
      child.finish();
      return true;
    },
    setPulse: () => ({}), clearPulse: () => {},
  });
  treeTest.start();
  assert.equal(await treeTest.stop(), true);
  assert.deepEqual(treeCalled, [424242]);
  assert.equal(treeTest.state, 'STOPPED');
  process.stdout.write('TEC01S_C3_OWNED_TREE_FALLBACK=GREEN\n');
  const unverifiable = new MockChild();
  unverifiable.pid = 434343;
  unverifiable.stdin = { write: () => {} };
  const failCodes = [];
  const failTest = new GatewaySupervisor({
    launch: () => unverifiable,
    health: async () => ({ framesRecent: true, count: 1 }),
    stopGraceMs: 5,
    killTree: async () => false,
    setPulse: () => ({}), clearPulse: () => {},
  });
  failTest.on('safestop', code => failCodes.push(code));
  failTest.start();
  assert.equal(await failTest.stop(), false);
  assert.deepEqual(failCodes, ['DESCENDANTS_UNVERIFIED']);
  process.stdout.write('TEC01S_C3_FAIL_CLOSED=GREEN\n');
  const fakeWindowsChild = {pid: 55555, exitCode: null, signalCode: null};
  const calls = [];
  assert.equal(await terminateOwnedProcessTree(fakeWindowsChild, {
    platform: 'win32',
    exec: (file, args, options, cb) => {
      calls.push({file, args, options});
      cb(null, '', '');
    },
  }), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].file, 'taskkill.exe');
  assert.deepEqual(calls[0].args, ['/PID', '55555', '/T', '/F']);
  assert.equal(calls[0].options.windowsHide, true);
  fakeWindowsChild.exitCode = 0;
  assert.equal(await terminateOwnedProcessTree(fakeWindowsChild, {
    platform: 'win32', exec: () => {throw new Error('MUST_NOT_RUN');},
  }), false);
  process.stdout.write('TEC01S_C3_SCOPED_TASKKILL=GREEN\n');
  process.stdout.write('TEC01R_SELF_TEST=GREEN\n');
  process.stdout.write('TEC01S_SELF_TEST=GREEN\n');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(SELF)) {
  if (process.argv.includes('--self-test')) {
    selfTest().catch(() => { process.stdout.write('TEC01R_SELF_TEST=SAFE_STOP\n'); process.exitCode = 2; });
  } else if (process.argv.includes('--run-dev')) {
    main().catch(error => {
      const allowed = new Set([
        'SAFE_STOP_DEV_ENV',
        'SAFE_STOP_GATEWAY_PORT_IN_USE',
        'SAFE_STOP_GATEWAY_PORT_UNVERIFIED',
      ]);
      const code = allowed.has(error?.message) ? error.message : 'SAFE_STOP_GATEWAY_SUPERVISOR';
      process.stdout.write(`${code}\n`);
      process.exitCode = 2;
    });
  }
}
