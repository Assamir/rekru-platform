/**
 * Wspólna logika endpointu /api/run – używana przez Cloudflare Pages Function
 * (functions/api/run.ts) oraz przez serwer deweloperski Vite (vite.config.ts).
 *
 * Kod Java jest kompilowany i uruchamiany przez Judge0 (https://judge0.com):
 *  - domyślnie publiczna instancja https://ce.judge0.com (bez klucza, limity per IP),
 *  - albo Judge0 na RapidAPI (ustaw JUDGE0_URL=https://judge0-ce.p.rapidapi.com i JUDGE0_KEY),
 *  - albo własna instancja (JUDGE0_URL + opcjonalnie JUDGE0_AUTH_TOKEN).
 */

export interface RunnerEnv {
  JUDGE0_URL?: string;
  JUDGE0_KEY?: string;
  JUDGE0_AUTH_TOKEN?: string;
  JAVA_LANGUAGE_ID?: string;
  ACCESS_CODE?: string;
}

export interface RunRequest {
  language: 'java';
  source: string;
  accessCode?: string;
}

export interface RunResponse {
  ok: boolean;
  status: string;
  statusId: number;
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
  timeSec: number | null;
  memoryKb: number | null;
}

export const MAX_SOURCE_BYTES = 256 * 1024;

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const b64encode = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

const b64decode = (s: string | null | undefined) => {
  if (!s) return '';
  const bin = atob(s.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

export const DEFAULT_JUDGE0_URL = 'https://ce.judge0.com';

/**
 * mode = "direct": przeglądarka kandydata woła Judge0 bezpośrednio (limit per IP kandydata,
 *                  brak sekretów do ukrycia) – domyślne dla darmowej publicznej instancji.
 * mode = "proxy":  zapytania idą przez /api/run (gdy jest klucz API, token lub kod dostępu).
 */
export function publicConfig(env: RunnerEnv & { JAVA_RUNNER?: string }) {
  const judge0Url = (env.JUDGE0_URL || DEFAULT_JUDGE0_URL).replace(/\/+$/, '');
  const proxy = Boolean(env.JUDGE0_KEY || env.JUDGE0_AUTH_TOKEN || env.ACCESS_CODE || env.JAVA_RUNNER === 'local');
  return {
    java: true,
    mode: proxy ? ('proxy' as const) : ('direct' as const),
    judge0Url: proxy ? undefined : judge0Url,
    javaLanguageId: parseInt(env.JAVA_LANGUAGE_ID || '62', 10),
    accessCodeRequired: Boolean(env.ACCESS_CODE),
    engine: env.JAVA_RUNNER === 'local' ? 'lokalny JDK' : new URL(judge0Url).host,
  };
}

export function validateRequest(body: unknown, env: RunnerEnv): RunRequest {
  if (!body || typeof body !== 'object') throw new HttpError(400, 'Nieprawidłowe żądanie.');
  const req = body as Partial<RunRequest>;
  if (req.language !== 'java') throw new HttpError(400, 'Obsługiwany jest tylko język Java.');
  if (typeof req.source !== 'string' || req.source.length === 0) throw new HttpError(400, 'Brak kodu źródłowego.');
  if (new TextEncoder().encode(req.source).length > MAX_SOURCE_BYTES) {
    throw new HttpError(413, 'Kod źródłowy jest zbyt duży.');
  }
  if (env.ACCESS_CODE && req.accessCode !== env.ACCESS_CODE) {
    throw new HttpError(403, 'Nieprawidłowy kod dostępu do kompilatora. Poproś rekrutera o nowy link.');
  }
  return req as RunRequest;
}

export async function runOnJudge0(req: RunRequest, env: RunnerEnv, fetchImpl: typeof fetch = fetch): Promise<RunResponse> {
  const base = (env.JUDGE0_URL || DEFAULT_JUDGE0_URL).replace(/\/+$/, '');
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (env.JUDGE0_KEY) {
    headers['x-rapidapi-key'] = env.JUDGE0_KEY;
    headers['x-rapidapi-host'] = new URL(base).host;
  }
  if (env.JUDGE0_AUTH_TOKEN) headers['x-auth-token'] = env.JUDGE0_AUTH_TOKEN;

  const res = await fetchImpl(`${base}/submissions?base64_encoded=true&wait=true&fields=*`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      language_id: parseInt(env.JAVA_LANGUAGE_ID || '62', 10),
      source_code: b64encode(req.source),
      stdin: '',
    }),
  });

  if (res.status === 429) throw new HttpError(429, 'Przekroczono limit uruchomień kompilatora (Judge0). Spróbuj za chwilę.');
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new HttpError(502, `Kompilator zwrócił błąd HTTP ${res.status}. ${text.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    stdout?: string;
    stderr?: string;
    compile_output?: string;
    message?: string;
    status?: { id: number; description: string };
    time?: string | null;
    memory?: number | null;
  };
  const statusId = data.status?.id ?? 0;
  return {
    ok: statusId === 3,
    status: data.status?.description ?? 'Unknown',
    statusId,
    stdout: b64decode(data.stdout),
    stderr: b64decode(data.stderr),
    compileOutput: b64decode(data.compile_output),
    message: b64decode(data.message),
    timeSec: data.time ? parseFloat(data.time) : null,
    memoryKb: data.memory ?? null,
  };
}
