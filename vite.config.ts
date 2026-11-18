/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { HttpError, publicConfig, runOnJudge0, validateRequest, type RunnerEnv } from './functions/_lib/runner.ts';

/**
 * W trybie deweloperskim (`npm run dev`) emuluje Cloudflare Pages Functions:
 * GET /api/config i POST /api/run. Ustaw JAVA_RUNNER=local w .env.local,
 * żeby kompilować Javę lokalnym JDK zamiast Judge0.
 */
function devApi(env: Record<string, string>): Plugin {
  const runnerEnv: RunnerEnv = env;
  return {
    name: 'rekru-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        const send = (status: number, data: unknown) => {
          res.statusCode = status;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(data));
        };
        try {
          if (req.url === '/api/config' && req.method === 'GET') {
            return send(200, publicConfig(env));
          }
          if (req.url === '/api/run' && req.method === 'POST') {
            let raw = '';
            for await (const chunk of req) raw += chunk;
            const body = validateRequest(JSON.parse(raw || 'null'), runnerEnv);
            if (env.JAVA_RUNNER === 'local') {
              const { runJavaLocally } = await import('./scripts/localJava.ts');
              return send(200, await runJavaLocally(body));
            }
            return send(200, await runOnJudge0(body, runnerEnv));
          }
          return send(404, { error: 'Not found' });
        } catch (e) {
          if (e instanceof HttpError) return send(e.status, { error: e.message });
          return send(500, { error: String(e) });
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env } as Record<string, string>;
  return {
    plugins: [react(), devApi(env)],
    build: {
      chunkSizeWarningLimit: 6000,
      sourcemap: false,
    },
    worker: { format: 'es' },
    test: {
      include: ['test/**/*.test.ts'],
      environment: 'node',
      testTimeout: 60_000,
    },
  };
});
