import { spawn } from 'node:child_process';

const ORDERS_PORT = Number(process.env.HW14_ORDERS_PORT ?? '20291');
const PAYMENTS_PORT = Number(process.env.HW14_PAYMENTS_PORT ?? '5001');

const ORDERS_BASE_URL = `http://localhost:${ORDERS_PORT}/api/v1`;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function base64UrlDecodeToString(input) {
  const s = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64').toString('utf8');
}

function decodeJwtPayload(token) {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('Invalid JWT: missing payload');
  return JSON.parse(base64UrlDecodeToString(payload));
}

function runProcess({ name, cwd, command, args, env, ready }) {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const state = { name, child, ready: false };

  const onLine = (buf) => {
    const text = buf.toString('utf8');
    for (const line of text.split(/\r?\n/)) {
      if (!line) continue;

      if (!state.ready && ready(line)) state.ready = true;
    }
  };

  child.stdout.on('data', onLine);
  child.stderr.on('data', onLine);

  child.on('exit', (code, signal) => {
    if (!state.ready) {
      console.error(`[${name}] exited early code=${code} signal=${signal}`);
    }
  });

  return state;
}

async function waitReady(proc, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (proc.ready) return;
    if (proc.child.exitCode !== null) {
      throw new Error(`[${proc.name}] exited before ready (code=${proc.child.exitCode})`);
    }
    await sleep(100);
  }
  throw new Error(`[${proc.name}] not ready in ${timeoutMs}ms`);
}

async function killProcess(proc) {
  if (!proc) return;
  if (proc.child.exitCode !== null) return;

  proc.child.kill('SIGTERM');
  const startedAt = Date.now();
  while (Date.now() - startedAt < 4000) {
    if (proc.child.exitCode !== null) return;
    await sleep(100);
  }
  proc.child.kill('SIGKILL');
}

async function httpJson(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  return { status: res.status, json, text };
}

async function runHappyPath({ productName }) {
  const product = await httpJson('POST', `${ORDERS_BASE_URL}/products`, {
    name: productName,
    price: 49.99,
    stock: 50,
  });
  if (product.status !== 201 || !product.json?.id) {
    throw new Error(`Create product failed: HTTP ${product.status} body=${product.text}`);
  }

  const email = `happy.${Date.now()}@path.com`;
  const reg = await httpJson('POST', `${ORDERS_BASE_URL}/auth/register`, {
    firstName: 'Happy',
    lastName: 'Path',
    age: 30,
    email,
    password: 'secret123',
  });
  if (reg.status !== 201 || !reg.json?.accessToken) {
    throw new Error(`Register failed: HTTP ${reg.status} body=${reg.text}`);
  }

  const payload = decodeJwtPayload(reg.json.accessToken);
  const userId = payload.sub;
  if (!userId) throw new Error('JWT payload missing sub');

  const order = await httpJson('POST', `${ORDERS_BASE_URL}/orders`, {
    userId,
    idempotencyKey: `order-happy-${Date.now()}`,
    items: [{ productId: product.json.id, quantity: 1 }],
  });

  if (order.status !== 201) {
    throw new Error(`Create order (happy) failed: HTTP ${order.status} body=${order.text}`);
  }
  if (!order.json?.paymentId || order.json?.paymentStatus !== 'AUTHORIZED') {
    throw new Error(`Unexpected happy response: ${order.text}`);
  }

  return { userId, productId: product.json.id };
}

async function runTimeoutCase({ userId, productId }) {
  const order = await httpJson('POST', `${ORDERS_BASE_URL}/orders`, {
    userId,
    idempotencyKey: `order-timeout-${Date.now()}`,
    items: [{ productId, quantity: 1 }],
  });

  if (order.status !== 504) {
    throw new Error(`Expected HTTP 504, got ${order.status} body=${order.text}`);
  }
}

let paymentsProc;
let ordersProc;

async function main() {
  process.on('SIGINT', async () => {
    await killProcess(ordersProc);
    await killProcess(paymentsProc);
    process.exit(130);
  });

  try {
    // Phase 1 — happy path
    paymentsProc = runProcess({
      name: 'payments-service',
      cwd: new URL('../payments-service', import.meta.url).pathname,
      command: 'yarn',
      args: ['start:dev'],
      env: {
        PAYMENTS_GRPC_PORT: String(PAYMENTS_PORT),
        PAYMENTS_ARTIFICIAL_DELAY_MS: '0',
        PAYMENTS_DELAY_AUTHORIZE_MS: '0',
        PAYMENTS_DELAY_STATUS_MS: '0',
      },
      ready: (line) => line.includes(`Payments gRPC server listening on :${PAYMENTS_PORT}`),
    });

    await waitReady(paymentsProc, 15000);

    ordersProc = runProcess({
      name: 'orders-service',
      cwd: new URL('..', import.meta.url).pathname,
      command: 'yarn',
      args: ['start'],
      env: {
        PORT: String(ORDERS_PORT),
        PAYMENTS_GRPC_URL: `localhost:${PAYMENTS_PORT}`,
        PAYMENTS_GRPC_TIMEOUT_MS: '1000',
      },
      ready: (line) => line.includes('Nest application successfully started'),
    });

    await waitReady(ordersProc, 60000);

    const ctx = await runHappyPath({ productName: `Widget X ${Date.now()}` });
    console.log(`[gRPC Payments] Happy path OK (payment AUTHORIZED).`);

    // Phase 2 — deterministic timeout/deadline exceeded
    await killProcess(paymentsProc);

    paymentsProc = runProcess({
      name: 'payments-service',
      cwd: new URL('../payments-service', import.meta.url).pathname,
      command: 'yarn',
      args: ['start:dev'],
      env: {
        PAYMENTS_GRPC_PORT: String(PAYMENTS_PORT),
        PAYMENTS_DELAY_AUTHORIZE_MS: '3000',
      },
      ready: (line) => line.includes(`Payments gRPC server listening on :${PAYMENTS_PORT}`),
    });

    await waitReady(paymentsProc, 15000);

    await runTimeoutCase(ctx);
    console.log(`[gRPC Payments] Timeout case OK (HTTP 504).`);
  } finally {
    await killProcess(ordersProc);
    await killProcess(paymentsProc);
  }
}

await main();
