/**
 * Mini-środowisko testowe zgodne składniowo z Vitest / Jest:
 * describe / it / test (+ .skip .only .todo .each), hooki, expect, vi / jest.
 */
import { createExpect, ExpectationError, type ExpectState } from './expect';
import { format } from './format';
import { createVi } from './mock';
import type { TestResult, TestStatus } from '../types';

type Fn = (...args: any[]) => unknown;

interface TestCase {
  kind: 'test';
  name: string;
  fn?: Fn;
  skip: boolean;
  only: boolean;
  todo: boolean;
  timeout: number;
  parent: Suite;
}

interface Suite {
  kind: 'suite';
  name: string;
  parent?: Suite;
  children: (Suite | TestCase)[];
  beforeAll: Fn[];
  afterAll: Fn[];
  beforeEach: Fn[];
  afterEach: Fn[];
  skip: boolean;
  only: boolean;
}

export interface HarnessEvents {
  onTestStart?(suite: string, name: string): void;
  onResult(result: TestResult): void;
}

const DEFAULT_TIMEOUT = 5000;

function newSuite(name: string, parent?: Suite): Suite {
  return { kind: 'suite', name, parent, children: [], beforeAll: [], afterAll: [], beforeEach: [], afterEach: [], skip: false, only: false };
}

/** Formatowanie nazw w test.each: %s %d %i %f %j %o %p %# oraz $zmienna. */
function eachName(template: string, row: unknown, index: number): string {
  const args = Array.isArray(row) ? row : [row];
  let i = 0;
  let name = template.replace(/%[sdifjoOp#%]/g, (m) => {
    if (m === '%%') return '%';
    if (m === '%#') return String(index);
    const v = args[i++];
    if (m === '%s') return typeof v === 'string' ? v : format(v);
    if (m === '%d' || m === '%i') return String(m === '%i' ? Math.trunc(Number(v)) : Number(v));
    if (m === '%f') return String(Number(v));
    return format(v);
  });
  if (!Array.isArray(row) && row && typeof row === 'object') {
    name = name.replace(/\$([\w.]+)/g, (whole, path: string) => {
      let cur: unknown = row;
      for (const p of path.split('.')) cur = cur == null ? undefined : (cur as Record<string, unknown>)[p];
      return cur === undefined && !(path in (row as object)) ? whole : typeof cur === 'string' ? cur : format(cur);
    });
  }
  return name;
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    p,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${what}: przekroczono limit czasu ${ms} ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function call(fn: Fn, timeout: number, what: string) {
  if (fn.length > 0) {
    // styl z callbackiem done()
    await withTimeout(
      new Promise<void>((resolve, reject) => {
        const done = (err?: unknown) => (err ? reject(err) : resolve());
        (done as unknown as { fail: (e: unknown) => void }).fail = (e: unknown) => reject(e instanceof Error ? e : new Error(String(e)));
        try {
          const r = fn(done);
          if (r && typeof (r as Promise<unknown>).then === 'function') (r as Promise<unknown>).catch(reject);
        } catch (e) {
          reject(e);
        }
      }),
      timeout,
      what,
    );
    return;
  }
  await withTimeout(Promise.resolve().then(() => fn()), timeout, what);
}

export function describeError(e: unknown): string {
  if (e instanceof Error) {
    if (e instanceof ExpectationError || e.name === 'AssertionError') return e.message;
    const stack = (e.stack ?? '')
      .split('\n')
      .filter((l) => /^\s+at /.test(l) && !/harness|expect\.ts|mock\.ts|tsRunner|moduleSystem/.test(l))
      .slice(0, 5)
      .join('\n');
    return `${e.name}: ${e.message}${stack ? '\n' + stack : ''}`;
  }
  return `Rzucono wartość niebędącą błędem: ${format(e)}`;
}

export function createHarness(events: HarnessEvents) {
  const root = newSuite('');
  let current = root;
  let collecting = true;
  const expectState: ExpectState = { assertionCalls: 0, expectedAssertions: null, hasAssertions: false };
  const expect = createExpect(expectState);
  const vi = createVi();

  function addTest(name: string, fn: Fn | undefined, opts: Partial<TestCase>, timeout?: number) {
    if (!collecting) throw new Error('Nie można definiować testów wewnątrz innego testu.');
    current.children.push({ kind: 'test', name: String(name), fn, skip: false, only: false, todo: false, timeout: timeout ?? DEFAULT_TIMEOUT, parent: current, ...opts });
  }

  function addSuite(name: string, fn: Fn | undefined, opts: Partial<Suite>) {
    const s = newSuite(String(name), current);
    Object.assign(s, opts);
    current.children.push(s);
    const prev = current;
    current = s;
    try {
      const r = fn?.();
      if (r && typeof (r as Promise<unknown>).then === 'function') {
        console.warn(`describe("${name}") zwraca Promise – funkcja describe powinna być synchroniczna.`);
      }
    } finally {
      current = prev;
    }
  }

  type TestOpts = Partial<TestCase>;
  function makeTest(opts: TestOpts) {
    const t = (name: string, fn?: Fn, timeout?: number) => addTest(name, fn, opts, timeout);
    return Object.assign(t, {
      each:
        (table: unknown[] | TemplateStringsArray, ...tplArgs: unknown[]) =>
        (name: string, fn: Fn, timeout?: number) => {
          eachRows(table, tplArgs).forEach((row, i) => addTest(eachName(name, row, i), () => (Array.isArray(row) ? fn(...row) : fn(row)), opts, timeout));
        },
    });
  }
  function makeSuite(opts: Partial<Suite>) {
    const d = (name: string, fn?: Fn) => addSuite(name, fn, opts);
    return Object.assign(d, {
      each:
        (table: unknown[] | TemplateStringsArray, ...tplArgs: unknown[]) =>
        (name: string, fn: Fn) => {
          eachRows(table, tplArgs).forEach((row, i) => addSuite(eachName(name, row, i), () => (Array.isArray(row) ? fn(...row) : fn(row)), opts));
        },
    });
  }

  /** Obsługuje także tabelę w postaci tagged template: test.each`a | b ${1} | ${2}`. */
  function eachRows(table: unknown[] | TemplateStringsArray, tplArgs: unknown[]): unknown[] {
    if (Array.isArray(table) && 'raw' in (table as object)) {
      const headers = (table as unknown as TemplateStringsArray)[0].split('|').map((h) => h.trim()).filter(Boolean);
      const rows: Record<string, unknown>[] = [];
      for (let i = 0; i + headers.length <= tplArgs.length; i += headers.length) {
        rows.push(Object.fromEntries(headers.map((h, j) => [h, tplArgs[i + j]])));
      }
      return rows;
    }
    return table as unknown[];
  }

  const it = Object.assign(makeTest({}), {
    skip: makeTest({ skip: true }),
    only: makeTest({ only: true }),
    todo: (name: string) => addTest(name, undefined, { todo: true }),
    skipIf: (cond: unknown) => makeTest({ skip: !!cond }),
    runIf: (cond: unknown) => makeTest({ skip: !cond }),
    concurrent: makeTest({}),
  });
  const describe = Object.assign(makeSuite({}), {
    skip: makeSuite({ skip: true }),
    only: makeSuite({ only: true }),
    todo: (name: string) => addSuite(name, () => it.todo('(todo)'), {}),
    skipIf: (cond: unknown) => makeSuite({ skip: !!cond }),
    runIf: (cond: unknown) => makeSuite({ skip: !cond }),
    concurrent: makeSuite({}),
  });

  const hook = (key: 'beforeAll' | 'afterAll' | 'beforeEach' | 'afterEach') => (fn: Fn) => {
    current[key].push(fn);
  };

  const api = {
    describe,
    suite: describe,
    it,
    test: it,
    beforeAll: hook('beforeAll'),
    afterAll: hook('afterAll'),
    beforeEach: hook('beforeEach'),
    afterEach: hook('afterEach'),
    before: hook('beforeAll'),
    after: hook('afterAll'),
    expect,
    vi,
    jest: vi,
  };

  // ---------------------------------------------------------------- wykonanie

  function hasOnly(s: Suite): boolean {
    return s.children.some((c) => c.only || (c.kind === 'suite' && hasOnly(c)));
  }

  function suitePath(s: Suite): string {
    const names: string[] = [];
    for (let c: Suite | undefined = s; c; c = c.parent) if (c.name) names.unshift(c.name);
    return names.join(' › ');
  }

  function collectTests(s: Suite): TestCase[] {
    return s.children.flatMap((c) => (c.kind === 'test' ? [c] : collectTests(c)));
  }

  function report(t: TestCase, status: TestStatus, durationMs: number, message?: string) {
    events.onResult({ suite: suitePath(t.parent), name: t.name, status, durationMs, message });
  }

  function chain(s: Suite, key: 'beforeEach' | 'afterEach'): Fn[] {
    const out: Fn[] = [];
    for (let c: Suite | undefined = s; c; c = c.parent) {
      if (key === 'beforeEach') out.unshift(...c.beforeEach);
      else out.push(...c.afterEach);
    }
    return out;
  }

  async function runTest(t: TestCase, onlyMode: boolean, skipped: boolean) {
    const inOnly = !onlyMode || t.only || ancestorsOnly(t.parent);
    if (t.todo) return report(t, 'skipped', 0, 'todo');
    if (skipped || t.skip || !inOnly || !t.fn) return report(t, 'skipped', 0);

    events.onTestStart?.(suitePath(t.parent), t.name);
    expectState.assertionCalls = 0;
    expectState.expectedAssertions = null;
    expectState.hasAssertions = false;
    const start = performance.now();
    let error: unknown;
    try {
      for (const h of chain(t.parent, 'beforeEach')) await call(h, t.timeout, 'beforeEach');
      await call(t.fn, t.timeout, `Test "${t.name}"`);
      if (expectState.expectedAssertions !== null && expectState.assertionCalls !== expectState.expectedAssertions) {
        throw new ExpectationError(`expect.assertions(${expectState.expectedAssertions})\n\nOczekiwano ${expectState.expectedAssertions} asercji, wykonano ${expectState.assertionCalls}.`);
      }
      if (expectState.hasAssertions && expectState.assertionCalls === 0) {
        throw new ExpectationError('expect.hasAssertions()\n\nTest nie wykonał żadnej asercji.');
      }
    } catch (e) {
      error = e;
    }
    for (const h of chain(t.parent, 'afterEach')) {
      try {
        await call(h, t.timeout, 'afterEach');
      } catch (e) {
        error ??= e;
      }
    }
    const ms = Math.round(performance.now() - start);
    if (error === undefined) report(t, 'passed', ms);
    else {
      const isAssertion = error instanceof ExpectationError || (error instanceof Error && error.name === 'AssertionError');
      report(t, isAssertion ? 'failed' : 'error', ms, describeError(error));
    }
  }

  function ancestorsOnly(s: Suite | undefined): boolean {
    for (let c = s; c; c = c.parent) if (c.only) return true;
    return false;
  }

  async function runSuite(s: Suite, onlyMode: boolean, skipped: boolean) {
    const skip = skipped || s.skip;
    const willRun = !skip && collectTests(s).some((t) => !t.skip && !t.todo && (!onlyMode || t.only || ancestorsOnly(t.parent)));
    if (willRun) {
      for (const h of s.beforeAll) {
        try {
          await call(h, DEFAULT_TIMEOUT * 2, 'beforeAll');
        } catch (e) {
          for (const t of collectTests(s)) report(t, 'error', 0, `beforeAll nie powiódł się:\n${describeError(e)}`);
          return;
        }
      }
    }
    for (const c of s.children) {
      if (c.kind === 'test') await runTest(c, onlyMode, skip);
      else await runSuite(c, onlyMode, skip);
    }
    if (willRun) {
      for (const h of s.afterAll) {
        try {
          await call(h, DEFAULT_TIMEOUT * 2, 'afterAll');
        } catch (e) {
          events.onResult({ suite: suitePath(s), name: 'afterAll', status: 'error', durationMs: 0, message: describeError(e) });
        }
      }
    }
  }

  async function run() {
    collecting = false;
    await runSuite(root, hasOnly(root), false);
  }

  return { api, run, testCount: () => collectTests(root).length };
}
