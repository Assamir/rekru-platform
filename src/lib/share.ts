/**
 * Zadanie jest przekazywane kandydatowi w linku: treść pliku .md jest
 * kompresowana (deflate-raw) i kodowana base64url w części #hash adresu.
 * Hash nie jest wysyłany do serwera, więc treść zadania nie trafia do żadnych logów.
 */

const PREFIX = '#t=';

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes: Uint8Array, stream: TransformStream<Uint8Array, Uint8Array>): Promise<Uint8Array> {
  const res = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await res.arrayBuffer());
}

export async function encodeTask(markdown: string): Promise<string> {
  const raw = new TextEncoder().encode(markdown);
  const packed = await pipe(raw, new CompressionStream("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>);
  return toBase64Url(packed);
}

export async function decodeTask(payload: string): Promise<string> {
  const packed = fromBase64Url(payload);
  const raw = await pipe(packed, new DecompressionStream("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>);
  return new TextDecoder().decode(raw);
}

export async function buildShareUrl(markdown: string, accessCode?: string, origin = location.origin + location.pathname): Promise<string> {
  const code = accessCode ? `&k=${encodeURIComponent(accessCode)}` : '';
  return `${origin}${PREFIX}${await encodeTask(markdown)}${code}`;
}

export function readPayloadFromHash(hash = location.hash): { payload: string; accessCode?: string } | null {
  if (!hash.startsWith(PREFIX)) return null;
  const [payload, ...rest] = hash.slice(PREFIX.length).split('&');
  const params = new URLSearchParams(rest.join('&'));
  return { payload, accessCode: params.get('k') ?? undefined };
}

/** Krótki, stabilny identyfikator zadania – klucz do zapisu postępu kandydata. */
export async function taskId(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(digest)).slice(0, 16);
}
