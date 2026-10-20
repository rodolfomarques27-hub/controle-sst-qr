// SafeScan DEV: solicitações cadastrais autenticadas.
// Não realiza comparação facial nem autoriza acesso.
import { randomUUID } from 'node:crypto';
import { loadEnv } from 'vite';

const ROUTE = '/__safescan-dev/identity-request';
const STATUS_ROUTE = `${ROUTE}/status`;
const VERIFY_ROUTE = `${ROUTE}/verify`;

const BIOMETRIC_BLOCKERS = Object.freeze([
  'AUTHORIZATION_CHECK_NOT_IMPLEMENTED',
  'REFERENCE_REGISTRATION_NOT_IMPLEMENTED',
  'PAD_CHECK_NOT_IMPLEMENTED',
  'DECISION_POLICY_NOT_HOMOLOGATED'
]);
const TTL_MS = 60000;
const MAX_BODY_BYTES = 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LOCAL = new Set([
  '127.0.0.1', '::1', '::ffff:127.0.0.1' // NOSONAR - explicit loopback-only allowlist.
]);

function reply(response, status, data) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, private');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'none'");
  response.setHeader('Vary', 'Origin, Authorization, Sec-Fetch-Site');
  response.end(JSON.stringify(data));
}

async function readSmallJson(request) {
  const chunks = [];
  let bytes = 0;

  for await (const chunk of request) {
    bytes += chunk.length;

    if (bytes > MAX_BODY_BYTES) {
      throw new Error('BODY_TOO_LARGE');
    }

    chunks.push(chunk);
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function createSafeScanDevIdentityRequestPlugin() {
  const requests = new Map();

  return {
    name: 'safescan-dev-identity-request',
    apply: 'serve',

    configureServer(server) {
      const env = loadEnv(
        server.config.mode,
        server.config.root,
        'VITE_'
      );

      const apiUrl = String(env.VITE_SUPABASE_URL || '').trim();
      const anonKey = String(env.VITE_SUPABASE_ANON_KEY || '').trim();

      let trustedOrigin = null;

      try {
        const parsed = new URL(apiUrl);

        if (
          parsed.protocol === 'https:' &&
          !parsed.username &&
          !parsed.password &&
          !parsed.search &&
          !parsed.hash &&
          (parsed.pathname === '/' || parsed.pathname === '')
        ) {
          trustedOrigin = parsed.origin;
        }
      } catch {
        // Configuração ausente: negar solicitações.
      }

      server.middlewares.use(async (request, response, next) => {
        let path;

        try {
          path = new URL(
            request.url || '/',
            'http://127.0.0.1'
          ).pathname;
        } catch {
          return next();
        }

        if (path !== ROUTE && path !== STATUS_ROUTE && path !== VERIFY_ROUTE) return next();

        const localPort = request.socket.localPort;
        const host = String(request.headers.host || '');

        const hosts = new Set([
          `127.0.0.1:${localPort}`,
          `localhost:${localPort}`,
          `[::1]:${localPort}`
        ]);

        if (
          !LOCAL.has(request.socket.localAddress) ||
          !LOCAL.has(request.socket.remoteAddress) ||
          !hosts.has(host)
        ) {
          return reply(response, 403, {
            error: 'local_only'
          });
        }

        // Navegadores podem omitir Origin em GET same-origin.
        // POST e DELETE continuam exigindo Origin exato.
        const origin = request.headers.origin;
        const sameOriginGetWithoutOrigin =
          path === STATUS_ROUTE &&
          request.method === 'GET' &&
          origin === undefined;

        if (
          request.headers['sec-fetch-site'] !== 'same-origin' ||
          (!sameOriginGetWithoutOrigin &&
            origin !== `http://${host}`)
        ) {
          return reply(response, 403, {
            error: 'invalid_origin'
          });
        }

        const isStatus = path === STATUS_ROUTE;
        const isVerify = path === VERIFY_ROUTE;
        const isAction = isStatus || isVerify;
        const allowed = isVerify ? ['POST'] : isStatus ? ['GET', 'DELETE'] : ['POST'];

        if (!allowed.includes(request.method)) {
          response.setHeader('Allow', allowed.join(', '));
          return reply(response, 405, {
            error: 'method_not_allowed'
          });
        }

        if (!isAction && (
          request.url !== ROUTE ||
          !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(
            String(request.headers['content-type'] || '')
          )
        )) {
          return reply(response, 400, {
            error: 'invalid_request'
          });
        }

        if (!trustedOrigin || !anonKey || anonKey.length > 4096) {
          return reply(response, 503, {
            error: 'auth_unavailable'
          });
        }

        const tokenMatch =
          /^Bearer ([A-Za-z0-9._~+/-]{32,8192})$/.exec(
            String(request.headers.authorization || '')
          );

        if (!tokenMatch) {
          return reply(response, 401, {
            error: 'auth_required'
          });
        }

        let input;
        let statusId;

        if (isAction) {
          const url = new URL(request.url, 'http://127.0.0.1');
          const keys = [...url.searchParams.keys()];
          statusId = url.searchParams.get('requestId');

          if (
            keys.length !== 1 ||
            keys[0] !== 'requestId' ||
            !UUID.test(statusId)
          ) {
            return reply(response, 400, {
              error: 'invalid_request_id'
            });
          }
        } else {
          try {
            input = await readSmallJson(request);
          } catch {
            return reply(response, 400, {
              error: 'invalid_json'
            });
          }

          if (
            !input ||
            Array.isArray(input) ||
            typeof input !== 'object' ||
            Object.keys(input).length !== 2 ||
            !UUID.test(input.empresaId) ||
            !UUID.test(input.colaboradorId)
          ) {
            return reply(response, 400, {
              error: 'invalid_selection'
            });
          }
        }

        // JWT do próprio usuário, nunca service_role.
        const headers = {
          apikey: anonKey,
          Authorization: `Bearer ${tokenMatch[1]}`,
          Accept: 'application/json'
        };

        try {
          const who = await fetch(
            `${trustedOrigin}/auth/v1/user`,
            {
              headers,
              redirect: 'error',
              signal: AbortSignal.timeout(4000)
            }
          );

          if (!who.ok) {
            return reply(response, 401, {
              error: 'auth_required'
            });
          }

          const user = await who.json();

          if (!user || !UUID.test(user.id)) {
            return reply(response, 401, {
              error: 'auth_required'
            });
          }

          if (isAction) {
            const stored = requests.get(statusId);

            if (!stored || stored.userId !== user.id) {
              return reply(response, 404, {
                error: 'request_not_found'
              });
            }

            if (stored.expiresAt <= Date.now()) {
              requests.delete(statusId);
              return reply(response, 410, {
                error: 'request_expired'
              });
            }

            // Bloqueio obrigatório: não existe verificação biométrica
            // autorizada e homologada vinculada a esta solicitação.
            // Nenhuma câmera ou rotina SFace é iniciada aqui.
            if (isVerify) {
              return reply(response, 409, {
                code: 'BIOMETRIC_EXECUTION_DISABLED',
                verification: 'NOT_PERFORMED',
                accessRelease: 'DENIED',
                blockers: BIOMETRIC_BLOCKERS
              });
            }

            if (request.method === 'DELETE') {
              requests.delete(statusId);

              return reply(response, 200, {
                cancelled: true,
                verification: 'NOT_PERFORMED'
              });
            }

            return reply(response, 200, {
              requestId: statusId,
              status: 'PENDING_NO_BIOMETRIC_REFERENCE',
              verification: 'NOT_PERFORMED',
              expiresInSeconds: Math.ceil(
                (stored.expiresAt - Date.now()) / 1000
              )
            });
          }

          const query = new URL(
            `${trustedOrigin}/rest/v1/colaboradores`
          );

          query.searchParams.set('select', 'id,empresa_id');
          query.searchParams.set('id', `eq.${input.colaboradorId}`);
          query.searchParams.set('empresa_id', `eq.${input.empresaId}`);
          query.searchParams.set('limit', '1');

          const result = await fetch(query, {
            headers,
            redirect: 'error',
            signal: AbortSignal.timeout(4000)
          });

          if (!result.ok) {
            return reply(response, 403, {
              error: 'cadastro_unavailable'
            });
          }

          const rows = await result.json();

          if (
            !Array.isArray(rows) ||
            rows.length !== 1 ||
            rows[0]?.id !== input.colaboradorId ||
            rows[0]?.empresa_id !== input.empresaId
          ) {
            return reply(response, 403, {
              error: 'cadastro_unavailable'
            });
          }

          const now = Date.now();

          for (const [key, stored] of requests) {
            if (
              stored.expiresAt <= now ||
              stored.userId === user.id
            ) {
              requests.delete(key);
            }
          }

          if (requests.size >= 50) {
            return reply(response, 429, {
              error: 'capacity_reached'
            });
          }

          const requestId = randomUUID();

          requests.set(requestId, {
            userId: user.id,
            empresaId: input.empresaId,
            colaboradorId: input.colaboradorId,
            expiresAt: now + TTL_MS,
            status: 'PENDING_NO_BIOMETRIC_REFERENCE'
          });

          const timer = setTimeout(
            () => requests.delete(requestId),
            TTL_MS
          );

          timer.unref?.();

          return reply(response, 201, {
            requestId,
            expiresInSeconds: 60,
            verification: 'NOT_PERFORMED'
          });
        } catch {
          return reply(response, 503, {
            error: 'verification_unavailable'
          });
        }
      });
    }
  };
}