/**
 * Minimalny loader CommonJS dla skompilowanych plików TS kandydata.
 * Obsługuje importy względne ('./cart', './cart.js', './utils/index'),
 * moduły wbudowane (vitest, @jest/globals, node:assert, node:test)
 * oraz paczki npm wcześniej załadowane z CDN (package.json → esm.sh).
 */

export type ModuleSources = Record<string, string>; // ścieżka .ts → kod JS

export class ModuleNotFoundError extends Error {}

function normalize(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function dirname(path: string) {
  const i = path.lastIndexOf('/');
  return i === -1 ? '' : path.slice(0, i);
}

export function bareName(spec: string): string {
  if (spec.startsWith('node:')) return spec;
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

export function createModuleSystem(sources: ModuleSources, builtins: Record<string, unknown>) {
  const cache = new Map<string, { exports: unknown }>();

  function resolve(from: string, spec: string): string | null {
    const base = normalize(`${dirname(from)}/${spec}`);
    const stripped = base.replace(/\.(js|mjs|cjs|jsx)$/, '');
    const candidates = [base, `${stripped}.ts`, `${stripped}.tsx`, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
    return candidates.find((c) => c in sources) ?? null;
  }

  function requireFrom(from: string) {
    return (spec: string): unknown => {
      if (spec.startsWith('.') || spec.startsWith('/')) {
        const target = resolve(from, spec.startsWith('/') ? `.${spec}` : spec);
        if (!target) throw new ModuleNotFoundError(`Nie znaleziono modułu "${spec}" (importowany z ${from}).`);
        return load(target);
      }
      if (spec in builtins) return builtins[spec];
      if (spec.startsWith('node:') && spec.slice(5) in builtins) return builtins[spec.slice(5)];
      throw new ModuleNotFoundError(
        `Moduł "${spec}" nie jest dostępny. Dodaj go do "dependencies" w package.json zadania ` +
          `(paczki ładowane są z esm.sh) – moduły Node.js (fs, http…) nie działają w przeglądarce.`,
      );
    };
  }

  function load(path: string): unknown {
    const cached = cache.get(path);
    if (cached) return cached.exports;
    const module = { exports: {} as unknown };
    cache.set(path, module);
    const code = sources[path];
    // sourceURL pozwala na czytelne stack trace z nazwą pliku kandydata
    const fn = new Function('exports', 'require', 'module', '__filename', '__dirname', `${code}\n//# sourceURL=${path}`);
    fn(module.exports, requireFrom(path), module, path, dirname(path));
    return module.exports;
  }

  return { load, resolve };
}

/** Zbiera nazwy paczek z wywołań require("...") w skompilowanym kodzie. */
export function collectBareImports(sources: ModuleSources): string[] {
  const out = new Set<string>();
  for (const code of Object.values(sources)) {
    for (const m of code.matchAll(/\brequire\(\s*["']([^"'.\/][^"']*)["']\s*\)/g)) out.add(m[1]);
  }
  return [...out];
}

/** Zamienia przestrzeń nazw ESM na obiekt zgodny z interop CommonJS (__esModule). */
export function esmToCjs(ns: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { __esModule: true };
  for (const k of Object.keys(ns)) out[k] = ns[k];
  if (!('default' in out)) out.default = ns;
  return out;
}
