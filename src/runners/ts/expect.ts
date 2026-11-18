import { format, isAsymmetric, type AsymmetricMatcher } from './format';
import { isMock, type MockFn } from './mock';

export class ExpectationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

// ---------------------------------------------------------------- równość

function hasKey(obj: object, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function equals(a: unknown, b: unknown, strict = false, seen: [unknown, unknown][] = []): boolean {
  if (isAsymmetric(b)) return b.asymmetricMatch(a);
  if (isAsymmetric(a)) return a.asymmetricMatch(b);
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (seen.some(([x, y]) => x === a && y === b)) return true;
  seen = [...seen, [a, b]];

  if (a instanceof Date || b instanceof Date) {
    return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  }
  if (a instanceof RegExp || b instanceof RegExp) {
    return a instanceof RegExp && b instanceof RegExp && String(a) === String(b);
  }
  if (a instanceof Error && b instanceof Error) {
    return a.message === b.message && a.name === b.name;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (strict && Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;

  if (a instanceof Map || b instanceof Map) {
    if (!(a instanceof Map && b instanceof Map) || a.size !== b.size) return false;
    for (const [k, v] of a) {
      if (!b.has(k) || !equals(v, b.get(k), strict, seen)) return false;
    }
    return true;
  }
  if (a instanceof Set || b instanceof Set) {
    if (!(a instanceof Set && b instanceof Set) || a.size !== b.size) return false;
    outer: for (const v of a) {
      if (b.has(v)) continue;
      for (const w of b) if (equals(v, w, strict, seen)) continue outer;
      return false;
    }
    return true;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (strict && hasKey(a, String(i)) !== hasKey(b, String(i))) return false;
      if (!equals(a[i], b[i], strict, seen)) return false;
    }
    return true;
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keysA = Object.keys(ao).filter((k) => strict || ao[k] !== undefined);
  const keysB = Object.keys(bo).filter((k) => strict || bo[k] !== undefined);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!hasKey(bo, k) && !(isAsymmetric(ao[k]) || ao[k] === undefined)) return false;
    if (!equals(ao[k], bo[k], strict, seen)) return false;
  }
  return true;
}

function matchesObject(actual: unknown, expected: unknown): boolean {
  if (isAsymmetric(expected)) return expected.asymmetricMatch(actual);
  if (typeof expected !== 'object' || expected === null || typeof actual !== 'object' || actual === null) {
    return equals(actual, expected);
  }
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length && expected.every((e, i) => matchesObject(actual[i], e));
  }
  return Object.keys(expected).every(
    (k) => k in (actual as object) && matchesObject((actual as Record<string, unknown>)[k], (expected as Record<string, unknown>)[k]),
  );
}

// ---------------------------------------------------------------- asymetryczne

function asym(name: string, match: (v: unknown) => boolean, sample?: unknown): AsymmetricMatcher {
  return {
    $$asymmetric: true,
    asymmetricMatch: match,
    toString: () => (sample === undefined ? name : `${name}(${format(sample)})`),
  };
}

const asymmetric = {
  anything: () => asym('Anything', (v) => v !== null && v !== undefined),
  any: (ctor: unknown) =>
    asym(`Any<${(ctor as { name?: string })?.name ?? '?'}>`, (v) => {
      if (ctor === String) return typeof v === 'string' || v instanceof String;
      if (ctor === Number) return typeof v === 'number' || v instanceof Number;
      if (ctor === Boolean) return typeof v === 'boolean' || v instanceof Boolean;
      if (ctor === Function) return typeof v === 'function';
      if (ctor === Object) return typeof v === 'object' && v !== null;
      if (ctor === BigInt) return typeof v === 'bigint';
      if (ctor === Symbol) return typeof v === 'symbol';
      return typeof ctor === 'function' && v instanceof (ctor as new (...a: unknown[]) => unknown);
    }),
  objectContaining: (o: Record<string, unknown>) =>
    asym('ObjectContaining', (v) => typeof v === 'object' && v !== null && Object.keys(o).every((k) => equals((v as Record<string, unknown>)[k], o[k])), o),
  arrayContaining: (a: unknown[]) =>
    asym('ArrayContaining', (v) => Array.isArray(v) && a.every((e) => v.some((x) => equals(x, e))), a),
  stringContaining: (s: string) => asym('StringContaining', (v) => typeof v === 'string' && v.includes(s), s),
  stringMatching: (r: string | RegExp) =>
    asym('StringMatching', (v) => typeof v === 'string' && (typeof r === 'string' ? new RegExp(r) : r).test(v), r),
  closeTo: (n: number, digits = 2) =>
    asym('CloseTo', (v) => typeof v === 'number' && Math.abs(v - n) < Math.pow(10, -digits) / 2, n),
};

// ---------------------------------------------------------------- matchery

type Result = { pass: boolean; message: (not: boolean) => string };
type Matcher = (actual: unknown, ...args: any[]) => Result;

const ex = (name: string, not: boolean, expected: string, received: string, extra = '') =>
  `expect(received).${not ? 'not.' : ''}${name}(expected)\n\nExpected: ${not ? 'not ' : ''}${expected}\nReceived: ${received}${extra ? '\n\n' + extra : ''}`;
const simple = (name: string, not: boolean, received: string, what: string) =>
  `expect(received).${not ? 'not.' : ''}${name}()\n\nReceived: ${received}${what ? '\n' + what : ''}`;

function assertMock(actual: unknown, name: string): MockFn {
  if (!isMock(actual)) {
    throw new ExpectationError(`expect(received).${name}()\n\nreceived value must be a mock or spy function (vi.fn / jest.fn / vi.spyOn)\nReceived: ${format(actual)}`);
  }
  return actual;
}

const fmtCalls = (calls: unknown[][]) =>
  calls.length === 0 ? '  (brak wywołań)' : calls.map((c, i) => `  ${i + 1}: ${c.map((a) => format(a)).join(', ')}`).join('\n');

function getPath(obj: unknown, path: string | (string | number)[]) {
  const parts = Array.isArray(path) ? path : path.replace(/\[(\w+)\]/g, '.$1').split('.').filter(Boolean);
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return { found: false, value: undefined };
    const box = Object(cur) as Record<string | number, unknown>;
    if (!(p in box)) return { found: false, value: undefined };
    cur = box[p];
  }
  return { found: true, value: cur };
}

const num = (v: unknown, name: string) => {
  if (typeof v !== 'number' && typeof v !== 'bigint') {
    throw new ExpectationError(`expect(received).${name}(expected)\n\nreceived value must be a number or bigint\nReceived: ${format(v)}`);
  }
  return v as number;
};

const matchers: Record<string, Matcher> = {
  toBe: (a, e) => ({
    pass: Object.is(a, e),
    message: (not) =>
      ex('toBe', not, format(e), format(a), !not && equals(a, e, true) ? 'Wartości mają tę samą zawartość, ale to różne obiekty – użyj toEqual.' : ''),
  }),
  toEqual: (a, e) => ({ pass: equals(a, e), message: (not) => ex('toEqual', not, format(e), format(a)) }),
  toStrictEqual: (a, e) => ({ pass: equals(a, e, true), message: (not) => ex('toStrictEqual', not, format(e), format(a)) }),
  toBeTruthy: (a) => ({ pass: !!a, message: (not) => simple('toBeTruthy', not, format(a), '') }),
  toBeFalsy: (a) => ({ pass: !a, message: (not) => simple('toBeFalsy', not, format(a), '') }),
  toBeNull: (a) => ({ pass: a === null, message: (not) => simple('toBeNull', not, format(a), '') }),
  toBeUndefined: (a) => ({ pass: a === undefined, message: (not) => simple('toBeUndefined', not, format(a), '') }),
  toBeDefined: (a) => ({ pass: a !== undefined, message: (not) => simple('toBeDefined', not, format(a), '') }),
  toBeNaN: (a) => ({ pass: Number.isNaN(a), message: (not) => simple('toBeNaN', not, format(a), '') }),
  toBeGreaterThan: (a, e) => ({ pass: num(a, 'toBeGreaterThan') > e, message: (not) => ex('toBeGreaterThan', not, `> ${format(e)}`, format(a)) }),
  toBeGreaterThanOrEqual: (a, e) => ({ pass: num(a, 'toBeGreaterThanOrEqual') >= e, message: (not) => ex('toBeGreaterThanOrEqual', not, `>= ${format(e)}`, format(a)) }),
  toBeLessThan: (a, e) => ({ pass: num(a, 'toBeLessThan') < e, message: (not) => ex('toBeLessThan', not, `< ${format(e)}`, format(a)) }),
  toBeLessThanOrEqual: (a, e) => ({ pass: num(a, 'toBeLessThanOrEqual') <= e, message: (not) => ex('toBeLessThanOrEqual', not, `<= ${format(e)}`, format(a)) }),
  toBeCloseTo: (a, e: number, digits = 2) => ({
    pass: Math.abs(num(a, 'toBeCloseTo') - e) < Math.pow(10, -digits) / 2,
    message: (not) => ex('toBeCloseTo', not, `${format(e)} (precyzja ${digits})`, format(a)),
  }),
  toBeInstanceOf: (a, ctor: { name: string }) => ({
    pass: typeof ctor === 'function' && a instanceof (ctor as unknown as new () => unknown),
    message: (not) => ex('toBeInstanceOf', not, ctor?.name ?? format(ctor), a === null || a === undefined ? format(a) : (Object.getPrototypeOf(a)?.constructor?.name ?? typeof a)),
  }),
  toBeTypeOf: (a, t: string) => ({ pass: typeof a === t, message: (not) => ex('toBeTypeOf', not, t, typeof a) }),
  toContain: (a, e) => {
    const pass = typeof a === 'string' ? a.includes(String(e)) : a != null && typeof (a as Iterable<unknown>)[Symbol.iterator] === 'function' ? [...(a as Iterable<unknown>)].includes(e) : false;
    return { pass, message: (not) => ex('toContain', not, format(e), format(a)) };
  },
  toContainEqual: (a, e) => ({
    pass: Array.isArray(a) && a.some((x) => equals(x, e)),
    message: (not) => ex('toContainEqual', not, format(e), format(a)),
  }),
  toHaveLength: (a, n: number) => {
    const len = (a as { length?: unknown })?.length;
    return { pass: len === n, message: (not) => ex('toHaveLength', not, `length ${n}`, `length ${format(len)} – ${format(a)}`) };
  },
  toHaveProperty: (a, path: string | string[], ...rest: unknown[]) => {
    const { found, value } = getPath(a, path);
    const checkValue = rest.length > 0;
    const pass = found && (!checkValue || equals(value, rest[0]));
    return {
      pass,
      message: (not) =>
        ex('toHaveProperty', not, `ścieżka ${format(path)}${checkValue ? ` = ${format(rest[0])}` : ''}`, found ? `wartość ${format(value)}` : `brak właściwości w ${format(a)}`),
    };
  },
  toMatch: (a, e: string | RegExp) => ({
    pass: typeof a === 'string' && (typeof e === 'string' ? a.includes(e) : e.test(a)),
    message: (not) => ex('toMatch', not, format(e), format(a)),
  }),
  toMatchObject: (a, e) => ({ pass: matchesObject(a, e), message: (not) => ex('toMatchObject', not, format(e), format(a)) }),
  toThrow: (a, expected?: unknown) => {
    let thrown: unknown;
    let didThrow = false;
    if ((a as { __fromRejects?: boolean })?.__fromRejects) {
      didThrow = true;
      thrown = (a as { value: unknown }).value;
    } else if (typeof a === 'function') {
      try {
        (a as () => unknown)();
      } catch (e) {
        didThrow = true;
        thrown = e;
      }
    } else {
      throw new ExpectationError(`expect(received).toThrow()\n\nreceived value must be a function – owiń kod w funkcję: expect(() => fn()).toThrow()\nReceived: ${format(a)}`);
    }
    const msg = thrown instanceof Error ? thrown.message : String(thrown);
    let pass = didThrow;
    let desc = 'dowolny wyjątek';
    if (didThrow && expected !== undefined) {
      if (typeof expected === 'string') {
        pass = msg.includes(expected);
        desc = `komunikat zawierający ${format(expected)}`;
      } else if (expected instanceof RegExp) {
        pass = expected.test(msg);
        desc = `komunikat pasujący do ${expected}`;
      } else if (typeof expected === 'function') {
        pass = thrown instanceof (expected as new () => unknown);
        desc = `wyjątek typu ${(expected as { name: string }).name}`;
      } else if (expected instanceof Error) {
        pass = msg === expected.message;
        desc = `komunikat ${format(expected.message)}`;
      } else if (isAsymmetric(expected)) {
        pass = expected.asymmetricMatch(thrown);
        desc = expected.toString();
      }
    }
    return {
      pass,
      message: (not) =>
        `expect(received).${not ? 'not.' : ''}toThrow(${expected === undefined ? '' : 'expected'})\n\nOczekiwano: ${not ? 'brak: ' : ''}${desc}\n${didThrow ? `Rzucono: ${thrown instanceof Error ? `${thrown.name}: ${thrown.message}` : format(thrown)}` : 'Funkcja nie rzuciła wyjątku.'}`,
    };
  },
  toHaveBeenCalled: (a) => {
    const m = assertMock(a, 'toHaveBeenCalled');
    return { pass: m.mock.calls.length > 0, message: (not) => `expect(mock).${not ? 'not.' : ''}toHaveBeenCalled()\n\nLiczba wywołań: ${m.mock.calls.length}\n${fmtCalls(m.mock.calls)}` };
  },
  toHaveBeenCalledTimes: (a, n: number) => {
    const m = assertMock(a, 'toHaveBeenCalledTimes');
    return { pass: m.mock.calls.length === n, message: (not) => `expect(mock).${not ? 'not.' : ''}toHaveBeenCalledTimes(expected)\n\nExpected number of calls: ${not ? 'not ' : ''}${n}\nReceived number of calls: ${m.mock.calls.length}` };
  },
  toHaveBeenCalledWith: (a, ...args: unknown[]) => {
    const m = assertMock(a, 'toHaveBeenCalledWith');
    return {
      pass: m.mock.calls.some((c) => equals(c, args)),
      message: (not) => `expect(mock).${not ? 'not.' : ''}toHaveBeenCalledWith(...expected)\n\nExpected: ${args.map((x) => format(x)).join(', ')}\nReceived:\n${fmtCalls(m.mock.calls)}`,
    };
  },
  toHaveBeenLastCalledWith: (a, ...args: unknown[]) => {
    const m = assertMock(a, 'toHaveBeenLastCalledWith');
    const last = m.mock.calls[m.mock.calls.length - 1];
    return {
      pass: !!last && equals(last, args),
      message: (not) => `expect(mock).${not ? 'not.' : ''}toHaveBeenLastCalledWith(...expected)\n\nExpected: ${args.map((x) => format(x)).join(', ')}\nReceived:\n${fmtCalls(last ? [last] : [])}`,
    };
  },
  toHaveBeenNthCalledWith: (a, nth: number, ...args: unknown[]) => {
    const m = assertMock(a, 'toHaveBeenNthCalledWith');
    const call = m.mock.calls[nth - 1];
    return {
      pass: !!call && equals(call, args),
      message: (not) => `expect(mock).${not ? 'not.' : ''}toHaveBeenNthCalledWith(${nth}, ...expected)\n\nExpected: ${args.map((x) => format(x)).join(', ')}\nReceived:\n${fmtCalls(m.mock.calls)}`,
    };
  },
  toHaveReturned: (a) => {
    const m = assertMock(a, 'toHaveReturned');
    return { pass: m.mock.results.some((r) => r.type === 'return'), message: (not) => `expect(mock).${not ? 'not.' : ''}toHaveReturned()` };
  },
  toHaveReturnedWith: (a, v: unknown) => {
    const m = assertMock(a, 'toHaveReturnedWith');
    return {
      pass: m.mock.results.some((r) => r.type === 'return' && equals(r.value, v)),
      message: (not) => `expect(mock).${not ? 'not.' : ''}toHaveReturnedWith(expected)\n\nExpected: ${format(v)}\nReceived: ${m.mock.results.map((r) => format(r.value)).join(', ')}`,
    };
  },
};
matchers.toThrowError = matchers.toThrow;
matchers.toBeCalled = matchers.toHaveBeenCalled;
matchers.toBeCalledTimes = matchers.toHaveBeenCalledTimes;
matchers.toBeCalledWith = matchers.toHaveBeenCalledWith;
matchers.lastCalledWith = matchers.toHaveBeenLastCalledWith;

const UNSUPPORTED = ['toMatchSnapshot', 'toMatchInlineSnapshot', 'toThrowErrorMatchingSnapshot', 'toThrowErrorMatchingInlineSnapshot'];

// ---------------------------------------------------------------- expect()

export interface ExpectState {
  assertionCalls: number;
  expectedAssertions: number | null;
  hasAssertions: boolean;
}

export function createExpect(state: ExpectState) {
  function build(actual: unknown, customMessage: string | undefined, mode: 'sync' | 'resolves' | 'rejects', not: boolean) {
    const target: Record<string, unknown> = {};
    for (const [name, matcher] of Object.entries(matchers)) {
      target[name] = (...args: unknown[]) => {
        state.assertionCalls++;
        const check = (value: unknown) => {
          const r = matcher(value, ...args);
          if (r.pass === not) {
            const err = new ExpectationError((customMessage ? customMessage + '\n\n' : '') + r.message(not));
            throw err;
          }
        };
        if (mode === 'sync') return check(actual);
        return Promise.resolve(actual).then(
          (v) => {
            if (mode === 'rejects') throw new ExpectationError(`expect(received).rejects.${name}()\n\nOczekiwano odrzucenia promise, ale został rozwiązany wartością: ${format(v)}`);
            check(v);
          },
          (e) => {
            if (mode === 'resolves') throw new ExpectationError(`expect(received).resolves.${name}()\n\nOczekiwano rozwiązania promise, ale został odrzucony: ${e instanceof Error ? e.message : format(e)}`);
            check(name === 'toThrow' || name === 'toThrowError' ? { __fromRejects: true, value: e } : e);
          },
        );
      };
    }
    for (const name of UNSUPPORTED) {
      target[name] = () => {
        throw new ExpectationError(`${name}() nie jest obsługiwany na tej platformie – użyj toEqual / toMatchObject.`);
      };
    }
    return target;
  }

  function expect(actual: unknown, customMessage?: string) {
    const m = build(actual, customMessage, 'sync', false);
    m.not = build(actual, customMessage, 'sync', true);
    const resolves = build(actual, customMessage, 'resolves', false);
    resolves.not = build(actual, customMessage, 'resolves', true);
    const rejects = build(actual, customMessage, 'rejects', false);
    rejects.not = build(actual, customMessage, 'rejects', true);
    m.resolves = resolves;
    m.rejects = rejects;
    return m;
  }

  Object.assign(expect, asymmetric, {
    assertions(n: number) {
      state.expectedAssertions = n;
    },
    hasAssertions() {
      state.hasAssertions = true;
    },
    not: {
      objectContaining: (o: Record<string, unknown>) => {
        const m = asymmetric.objectContaining(o);
        return asym('NotObjectContaining', (v) => !m.asymmetricMatch(v), o);
      },
      arrayContaining: (a: unknown[]) => {
        const m = asymmetric.arrayContaining(a);
        return asym('NotArrayContaining', (v) => !m.asymmetricMatch(v), a);
      },
      stringContaining: (s: string) => asym('NotStringContaining', (v) => typeof v !== 'string' || !v.includes(s), s),
      stringMatching: (r: string | RegExp) => {
        const m = asymmetric.stringMatching(r);
        return asym('NotStringMatching', (v) => !m.asymmetricMatch(v), r);
      },
    },
  });
  return expect;
}
