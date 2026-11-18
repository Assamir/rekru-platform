/// <reference lib="webworker" />
/**
 * Web Worker uruchamiający skompilowany kod kandydata (CommonJS) w izolacji
 * od strony. Główny wątek może go w każdej chwili zakończyć (nieskończona pętla).
 */
import { formatConsoleArgs } from './format';
import { createHarness, describeError } from './harness';
import { bareName, collectBareImports, createModuleSystem, esmToCjs, type ModuleSources } from './moduleSystem';
import { createNodeAssert } from './nodeAssert';
import type { ConsoleLevel, TestResult } from '../types';

export interface RunMessage {
  type: 'run';
  sources: ModuleSources;
  testFiles: string[];
  /** mapa: nazwa paczki → URL modułu ESM (np. https://esm.sh/zod@3.23.8) */
  packages: Record<string, string>;
}

export type WorkerEvent =
  | { type: 'console'; level: ConsoleLevel; text: string }
  | { type: 'start'; suite: string; name: string }
  | { type: 'result'; result: TestResult }
  | { type: 'done'; mode: 'tests' | 'program' }
  | { type: 'fatal'; message: string };

const post = (e: WorkerEvent) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(e);

for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  console[level] = (...args: unknown[]) => post({ type: 'console', level, text: formatConsoleArgs(args) });
}
console.table = (data: unknown) => post({ type: 'console', level: 'log', text: formatConsoleArgs([data]) });

self.addEventListener('unhandledrejection', (e) => {
  post({ type: 'console', level: 'error', text: `Nieobsłużone odrzucenie Promise: ${describeError((e as PromiseRejectionEvent).reason)}` });
});

async function loadPackages(sources: ModuleSources, packages: Record<string, string>, skip: Set<string>) {
  const loaded: Record<string, unknown> = {};
  const wanted = collectBareImports(sources).filter((s) => !skip.has(s) && !skip.has(s.replace(/^node:/, '')));
  for (const spec of wanted) {
    const pkg = bareName(spec);
    const base = packages[pkg];
    if (!base) continue;
    const url = spec === pkg ? base : `${base}${spec.slice(pkg.length)}`;
    try {
      const ns = (await import(/* @vite-ignore */ url)) as Record<string, unknown>;
      loaded[spec] = esmToCjs(ns);
    } catch (e) {
      throw new Error(`Nie udało się pobrać paczki "${spec}" z ${url}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return loaded;
}

self.onmessage = async (ev: MessageEvent<RunMessage>) => {
  const { sources, testFiles, packages } = ev.data;
  try {
    const harness = createHarness({
      onTestStart: (suite, name) => post({ type: 'start', suite, name }),
      onResult: (result) => post({ type: 'result', result }),
    });
    const testApi = { ...harness.api, default: harness.api, __esModule: true };
    const assert = createNodeAssert();
    const builtins: Record<string, unknown> = {
      vitest: testApi,
      '@jest/globals': testApi,
      'bun:test': testApi,
      'node:test': { ...testApi, default: harness.api.test, mock: { fn: harness.api.vi.fn, method: harness.api.vi.spyOn } },
      assert,
      'assert/strict': assert,
    };
    Object.assign(builtins, await loadPackages(sources, packages, new Set(Object.keys(builtins))));
    Object.assign(self, harness.api);

    const modules = createModuleSystem(sources, builtins);
    if (testFiles.length === 0) {
      for (const path of Object.keys(sources)) modules.load(path);
      post({ type: 'done', mode: 'program' });
      return;
    }
    for (const file of testFiles) {
      try {
        modules.load(file);
      } catch (e) {
        post({ type: 'result', result: { suite: file, name: '(ładowanie pliku)', status: 'error', durationMs: 0, message: describeError(e) } });
      }
    }
    await harness.run();
    post({ type: 'done', mode: 'tests' });
  } catch (e) {
    post({ type: 'fatal', message: describeError(e) });
  }
};
