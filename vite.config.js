import { defineConfig } from "vite";
import { createSafeScanDevIdentityRequestPlugin } from "./infra/vision-gateway/dev/identityRequestDev.mjs";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import process from "node:process";
import { basename } from "node:path";

function safescanCameraDevStatusPlugin() {
    return {
        name: "safescan-camera-dev-status",
        apply: "serve",

        configureServer(server) {
            server.middlewares.use(
                "/__safescan-dev/camera-status",
                async (req, res) => {
                    const responder = (codigo, dados) => {
                        res.statusCode = codigo;
                        res.setHeader("Content-Type", "application/json; charset=utf-8");
                        res.setHeader("Cache-Control", "no-store");
                        res.setHeader("X-Content-Type-Options", "nosniff");
                        res.end(JSON.stringify(dados));
                    };

                    const remoto = req.socket.remoteAddress;

                    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remoto)) { // NOSONAR - explicit loopback-only DEV boundary.
                        responder(403, { error: "local_only" });
                        return;
                    }

                    const host = String(req.headers.host || "");

                    if (!/^(127\.0\.0\.1|localhost):[0-9]{1,5}$/.test(host)) {
                        responder(403, { error: "invalid_host" });
                        return;
                    }

                    if (
                        req.headers.origin &&
                        req.headers.origin !== `http://${host}`
                    ) {
                        responder(403, { error: "invalid_origin" });
                        return;
                    }

                    if (req.method !== "GET") {
                        res.setHeader("Allow", "GET");
                        responder(405, { error: "method_not_allowed" });
                        return;
                    }

                    if (req.url !== "/" && req.url !== "") {
                        responder(404, { error: "not_found" });
                        return;
                    }

                    const indisponivel = {
                        serviceAvailable: false,
                        streamFound: false,
                        producerCount: 0,
                        consumerCount: 0,
                    };

                    try {
                        const resposta = await globalThis.fetch(
                            "http://127.0.0.1:1984/api/streams?src=sala_teste",
                            {
                                signal: globalThis.AbortSignal.timeout(2500),
                                headers: { Accept: "application/json" },
                            },
                        );

                        if (!resposta.ok) {
                            responder(502, indisponivel);
                            return;
                        }

                        const dados = await resposta.json();

                        const stream =
                            dados?.sala_teste ??
                            (Array.isArray(dados?.producers) ? dados : null);

                        responder(200, {
                            serviceAvailable: true,
                            streamFound: Boolean(stream),
                            producerCount: Array.isArray(stream?.producers)
                                ? stream.producers.length
                                : 0,
                            consumerCount: Array.isArray(stream?.consumers)
                                ? stream.consumers.length
                                : 0,
                        });
                    } catch {
                        responder(503, indisponivel);
                    }
                },
            );
        },
    };
}

function safeScanDevGatewayHealthPlugin() {
  const route = '/__safescan-dev/gateway-health';

  const isLoopback = (address) =>
    address === '127.0.0.1' ||
    address === '::1' ||
    address === '::ffff:127.0.0.1'; // NOSONAR - explicit IPv4-mapped loopback value.

  return {
    name: 'safescan-dev-gateway-health',
    apply: 'serve',

    configureServer(vite) {
      vite.middlewares.use(async (request, response, next) => {
        let url;

        try {
          url = new globalThis.URL(
            request.url ?? '/',
            'http://127.0.0.1'
          );
        } catch {
          return next();
        }

        if (url.pathname !== route) {
          return next();
        }

        const send = (code, configured, reachable, operational = null) => {
          response.statusCode = code;

          response.setHeader(
            'Content-Type',
            'application/json; charset=utf-8'
          );

          response.setHeader(
            'Cache-Control',
            'no-store, private'
          );

          response.setHeader(
            'X-Content-Type-Options',
            'nosniff'
          );

          response.setHeader(
            'Content-Security-Policy',
            "default-src 'none'"
          );

          response.setHeader(
            'Vary',
            'Origin, Sec-Fetch-Site'
          );

          response.end(
            JSON.stringify(operational ? { configured, reachable, operational } : { configured, reachable })
          );
        };

        const localPort = request.socket.localPort;

        const allowedHosts = new Set([
          `127.0.0.1:${localPort}`,
          `localhost:${localPort}`,
          `[::1]:${localPort}`
        ]);

        const requestHost = request.headers.host ?? '';

        const localOnly =
          isLoopback(request.socket.localAddress) &&
          isLoopback(request.socket.remoteAddress);

        if (!localOnly || !allowedHosts.has(requestHost)) {
          return send(403, false, false);
        }

        const origin = request.headers.origin;

        if (origin !== undefined) {
          let validOrigin;

          try {
            const parsedOrigin = new globalThis.URL(origin);

            validOrigin =
              parsedOrigin.protocol === 'http:' &&
              parsedOrigin.host === requestHost &&
              parsedOrigin.origin === `http://${requestHost}`;
          } catch {
            validOrigin = false;
          }

          if (!validOrigin) {
            return send(403, false, false);
          }
        }

        const fetchSite = request.headers['sec-fetch-site'];

        if (
          fetchSite !== undefined &&
          fetchSite !== 'same-origin' &&
          fetchSite !== 'none'
        ) {
          return send(403, false, false);
        }

        if (url.search || url.hash) {
          return send(404, false, false);
        }

        if (request.method !== 'GET') {
          response.setHeader('Allow', 'GET');
          return send(405, false, false);
        }

        const portText =
          process.env.SAFESCAN_DEV_GATEWAY_PORT ?? '';

        if (!/^[0-9]{4,5}$/.test(portText)) {
          return send(503, false, false);
        }

        const port = Number(portText);

        if (
          !Number.isInteger(port) ||
          port < 1024 ||
          port > 65535 ||
          port === localPort
        ) {
          return send(503, false, false);
        }

        const abort = new globalThis.AbortController();

        const timeout = globalThis.setTimeout(
          () => abort.abort(),
          1800
        );

        try {
          const upstream = await globalThis.fetch(
            `http://127.0.0.1:${port}/health`,
            {
              method: 'GET',
              signal: abort.signal,
              redirect: 'error',
              headers: {
                Accept: 'application/json'
              }
            }
          );

          if (
            !upstream.ok ||
            !upstream.headers
              .get('content-type')
              ?.toLowerCase()
              .includes('application/json')
          ) {
            throw new Error('invalid-health-response');
          }

          const contentLength =
            upstream.headers.get('content-length');

          if (
            contentLength !== null &&
            (
              !Number.isFinite(Number(contentLength)) ||
              Number(contentLength) > 32768
            )
          ) {
            throw new Error('response-too-large');
          }

          if (!upstream.body) {
            throw new Error('empty-response');
          }

          const chunks = [];
          let totalBytes = 0;

          for await (const chunk of upstream.body) {
            totalBytes += chunk.byteLength;

            if (totalBytes > 32768) {
              throw new Error('response-too-large');
            }

            chunks.push(globalThis.Buffer.from(chunk));
          }

          const payload = JSON.parse(
            globalThis.Buffer.concat(chunks).toString('utf8')
          );

          if (
            !payload ||
            typeof payload !== 'object' ||
            typeof payload.status !== 'string' ||
            !Array.isArray(payload.cameras)
          ) {
            throw new Error('invalid-health-schema');
          }

          // Nunca retornar o snapshot original.
                    const validStates = new Set([
            'NO_CAMERA_CONFIGURED',
            'NO_ACTIVE_SESSION',
            'SESSION_NO_RECENT_FRAMES',
            'FRAMES_RECENT'
          ]);

          const validSessions = new Set([
            'NOT_STARTED', 'STARTING', 'RUNNING',
            'STOPPING', 'STOPPED', 'RECONNECTING'
          ]);

          let operational = null;

          if (
            payload.mode === 'READ_ONLY_DEV' &&
            validStates.has(payload.status) &&
            Number.isSafeInteger(payload.cameraCount) &&
            payload.cameraCount >= 0 &&
            payload.cameraCount <= 1 &&
            payload.cameraCount === payload.cameras.length
          ) {
            operational = {
              status: payload.status,
              cameraCount: payload.cameraCount,
              cameras: payload.cameras.map(camera => ({
                sessionState: validSessions.has(camera?.sessionState)
                  ? camera.sessionState : 'NOT_STARTED',
                sessionRunning: camera?.sessionRunning === true,
                recentFrames: camera?.recentFrames === true,
                reconnectScheduled: camera?.reconnectScheduled === true,
                lastFrameCount:
                  Number.isSafeInteger(camera?.lastFrameCount) &&
                  camera.lastFrameCount >= 0
                    ? camera.lastFrameCount : 0
              }))
            };
          }

          // Projecao restrita: nunca encaminhar frames, RTSP ou identidade.
          if (operational && payload.faceDetection) {
            const f = payload.faceDetection;
            const states = new Set([
              'INITIALIZING', 'WAITING_FOR_FRAMES', 'FACE_DETECTED',
              'NO_FACE', 'STALE', 'ERROR', 'UNAVAILABLE'
            ]);
            const valid =
              f && typeof f === 'object' && !Array.isArray(f) &&
              states.has(f.status) &&
              Number.isSafeInteger(f.faceCount) &&
              f.faceCount >= 0 && f.faceCount <= 20 &&
              typeof f.maxConfidence === 'number' &&
              Number.isFinite(f.maxConfidence) &&
              f.maxConfidence >= 0 && f.maxConfidence <= 1;
            const stamp = typeof f?.updatedAt === 'string'
              ? Date.parse(f.updatedAt) : Number.NaN;
            const fresh =
              Number.isFinite(stamp) &&
              stamp <= Date.now() &&
              Date.now() - stamp <= 10000 &&
              operational.status === 'FRAMES_RECENT';
            const measured =
              f?.status === 'FACE_DETECTED' ||
              f?.status === 'NO_FACE';
            const state = valid && (!measured || fresh)
              ? f.status : 'UNAVAILABLE';
            operational.faceDetection = {
              status: state,
              faceCount: state === 'FACE_DETECTED' ? f.faceCount : 0,
              maxConfidence: state === 'FACE_DETECTED' ? f.maxConfidence : 0,
              updatedAt: measured && fresh && valid
                ? new Date(stamp).toISOString() : null
            };
          }
          if (operational && payload.faceVerification) {
            const v = payload.faceVerification;
            const allowed = new Set([
              'INITIALIZING', 'WAITING_FOR_FACE', 'REFERENCE_READY',
              'COMPARISON_COMPLETE', 'WAITING_FOR_RETURN', 'EXPIRED', 'ERROR', 'UNAVAILABLE'
            ]);
            operational.faceVerification = {
              status: v && typeof v === 'object' && !Array.isArray(v) &&
                allowed.has(v.status) && operational.status === 'FRAMES_RECENT'
                  ? v.status : 'UNAVAILABLE'
            };
          }
          if (operational && payload.ppeDetection) {
            const p = payload.ppeDetection;

            const allowedPpeStates = new Set([
              'INITIALIZING',
              'WAITING_FOR_FRAMES',
              'PPE_DETECTED',
              'NO_PERSON',
              'STALE',
              'ERROR',
              'UNAVAILABLE'
            ]);

            const classKeys = [
              'hardhat',
              'noHardhat',
              'vest',
              'noVest',
              'person'
            ];

            const validCounts =
              p?.counts &&
              typeof p.counts === 'object' &&
              !Array.isArray(p.counts) &&
              classKeys.every(key =>
                Number.isSafeInteger(p.counts[key]) &&
                p.counts[key] >= 0 &&
                p.counts[key] <= 50
              );

            const validConfidence =
              p?.maxConfidence &&
              typeof p.maxConfidence === 'object' &&
              !Array.isArray(p.maxConfidence) &&
              classKeys.every(key =>
                typeof p.maxConfidence[key] === 'number' &&
                Number.isFinite(p.maxConfidence[key]) &&
                p.maxConfidence[key] >= 0 &&
                p.maxConfidence[key] <= 1
              );

            const validPersonCount =
              Number.isSafeInteger(p?.personCount) &&
              p.personCount >= 0 &&
              p.personCount <= 50;

            const validState =
              p &&
              typeof p === 'object' &&
              !Array.isArray(p) &&
              allowedPpeStates.has(p.status);

            const ppeStamp =
              typeof p?.updatedAt === 'string'
                ? Date.parse(p.updatedAt)
                : Number.NaN;

            const ppeMeasured =
              p?.status === 'PPE_DETECTED' ||
              p?.status === 'NO_PERSON';

            const ppeFresh =
              Number.isFinite(ppeStamp) &&
              ppeStamp <= Date.now() &&
              Date.now() - ppeStamp <= 10000 &&
              operational.status === 'FRAMES_RECENT';

            const ppeState =
              validState &&
              validCounts &&
              validConfidence &&
              validPersonCount &&
              (!ppeMeasured || ppeFresh)
                ? p.status
                : 'UNAVAILABLE';

            const measuredAndAvailable =
              ppeState === 'PPE_DETECTED';

            operational.ppeDetection = {
              status:
                ppeState,

              personCount:
                measuredAndAvailable
                  ? p.personCount
                  : 0,

              counts:
                Object.fromEntries(
                  classKeys.map(key => [
                    key,
                    measuredAndAvailable
                      ? p.counts[key]
                      : 0
                  ])
                ),

              maxConfidence:
                Object.fromEntries(
                  classKeys.map(key => [
                    key,
                    measuredAndAvailable
                      ? p.maxConfidence[key]
                      : 0
                  ])
                ),

              updatedAt:
                ppeMeasured &&
                ppeFresh &&
                validState &&
                validCounts &&
                validConfidence &&
                validPersonCount
                  ? new Date(ppeStamp).toISOString()
                  : null
            };
          }

          return send(200, true, true, operational);

        } catch {
          return send(503, true, false);

        } finally {
          globalThis.clearTimeout(timeout);
        }
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const dataBuild = new Date();
    const commitBuild = String(process.env.VERCEL_GIT_COMMIT_SHA || "").slice(0, 8);
    const idBuild = commitBuild || dataBuild.toISOString().replace(/\D/g, "").slice(0, 14);
    const ambienteBuild = process.env.VERCEL_ENV || (mode === "production" ? "production" : "development");
    const origemBuild = process.env.VITE_BUILD_SOURCE
        || process.env.VERCEL_GIT_COMMIT_REF
        || process.env.VERCEL_PROJECT_NAME
        || basename(process.cwd());

    return {
        plugins: [createSafeScanDevIdentityRequestPlugin(), safeScanDevGatewayHealthPlugin(), react(), tailwindcss(), safescanCameraDevStatusPlugin()],
        define: {
            "import.meta.env.VITE_APP_VERSION": JSON.stringify(process.env.npm_package_version || "1.0.11"),
            "import.meta.env.VITE_APK_VERSION": JSON.stringify("1.0.8"),
            "import.meta.env.VITE_APP_BUILD_DATE": JSON.stringify(dataBuild.toISOString()),
            "import.meta.env.VITE_APP_BUILD_ID": JSON.stringify(idBuild),
            "import.meta.env.VITE_APP_BUILD_ENV": JSON.stringify(ambienteBuild),
            "import.meta.env.VITE_APP_BUILD_SOURCE": JSON.stringify(origemBuild),
        },
    build: {
        rolldownOptions: {
            output: {
                strictExecutionOrder: true,
                codeSplitting: {
                    groups: [
                        {
                            name: "vendor-react",
                            test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                            priority: 60,
                        },
                        {
                            name: "vendor-supabase",
                            test: /node_modules[\\/]@supabase[\\/]/,
                            priority: 50,
                        },
                        {
                            name: "vendor-icons",
                            test: /node_modules[\\/]lucide-react[\\/]/,
                            priority: 40,
                        },
                        {
                            name: "vendor-motion",
                            test: /node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/,
                            priority: 35,
                        },
                        {
                            name: "vendor-pdf",
                            test: /node_modules[\\/]pdfjs-dist[\\/]/,
                            priority: 45,
                        },
                        {
                            name: "vendor-jspdf",
                            test: /node_modules[\\/]jspdf[\\/]/,
                            priority: 46,
                        },
                        {
                            name: "vendor-html2canvas",
                            test: /node_modules[\\/]html2canvas[\\/]/,
                            priority: 45,
                        },
                        {
                            name: "vendor-export-support",
                            test: /node_modules[\\/](canvg|dompurify|fflate)[\\/]/,
                            priority: 44,
                        },
                        {
                            name: "vendor-ocr",
                            test: /node_modules[\\/](tesseract\.js|tesseract\.js-core|bmp-js|idb-keyval|zlibjs)[\\/]/,
                            priority: 43,
                        },
                        {
                            name: "vendor-map",
                            test: /node_modules[\\/](@react-leaflet|react-leaflet|leaflet)[\\/]/,
                            priority: 42,
                        },
                        {
                            name: "vendor-excel-xlsx",
                            test: /node_modules[\\/]exceljs[\\/]lib[\\/]xlsx[\\/]/,
                            priority: 41,
                        },
                        {
                            name: "vendor-excel-core",
                            test: /node_modules[\\/]exceljs[\\/]/,
                            priority: 40,
                        },
                        {
                            name: "vendor-excel-support",
                            test: /node_modules[\\/](archiver|dayjs|fast-csv|jszip|readable-stream|saxes|tmp|unzipper|uuid)[\\/]/,
                            priority: 39,
                        },
                        {
                            name: "vendor-qrcode",
                            test: /node_modules[\\/]qrcode\.react[\\/]/,
                            priority: 25,
                        },
                        {
                            name: "vendor-misc",
                            test: /node_modules[\\/]/,
                            priority: 10,
                        },
                    ],
                },
            },
        },
        },
    };
});
