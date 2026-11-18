/** Podzbiór node:assert – dla kandydatów, którzy wolą node:test + assert. */
import { equals } from './expect';
import { format } from './format';

class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

const fail = (msg: string | undefined, fallback: string): never => {
  throw new AssertionError(msg ?? fallback);
};

function matchesExpected(err: unknown, expected: unknown): boolean {
  if (expected === undefined) return true;
  if (expected instanceof RegExp) return expected.test(err instanceof Error ? err.message : String(err));
  if (typeof expected === 'function') {
    if ((expected as { prototype?: unknown }).prototype !== undefined && err instanceof (expected as new () => unknown)) return true;
    return Error.isPrototypeOf(expected) ? false : (expected as (e: unknown) => boolean)(err) === true;
  }
  if (typeof expected === 'object' && expected !== null) {
    return Object.entries(expected).every(([k, v]) => equals((err as Record<string, unknown>)?.[k], v));
  }
  return false;
}

export function createNodeAssert() {
  const assert = (value: unknown, message?: string) => {
    if (!value) fail(message, `The expression evaluated to a falsy value: ${format(value)}`);
  };
  Object.assign(assert, {
    AssertionError,
    ok: assert,
    equal: (a: unknown, b: unknown, m?: string) => a == b || fail(m, `${format(a)} == ${format(b)}`),
    notEqual: (a: unknown, b: unknown, m?: string) => a != b || fail(m, `${format(a)} != ${format(b)}`),
    strictEqual: (a: unknown, b: unknown, m?: string) => Object.is(a, b) || fail(m, `Expected values to be strictly equal:\n\n${format(a)} !== ${format(b)}`),
    notStrictEqual: (a: unknown, b: unknown, m?: string) => !Object.is(a, b) || fail(m, `Expected "actual" to be strictly unequal to: ${format(b)}`),
    deepEqual: (a: unknown, b: unknown, m?: string) => equals(a, b) || fail(m, `Expected values to be loosely deep-equal:\n\n${format(a)}\n\nshould loosely deep-equal\n\n${format(b)}`),
    deepStrictEqual: (a: unknown, b: unknown, m?: string) => equals(a, b, true) || fail(m, `Expected values to be strictly deep-equal:\n+ actual: ${format(a)}\n- expected: ${format(b)}`),
    notDeepStrictEqual: (a: unknown, b: unknown, m?: string) => !equals(a, b, true) || fail(m, `Expected "actual" not to be strictly deep-equal to: ${format(b)}`),
    match: (s: string, r: RegExp, m?: string) => r.test(s) || fail(m, `The input did not match the regular expression ${r}. Input: ${format(s)}`),
    fail: (m?: string) => fail(m, 'Failed'),
    throws: (fn: () => unknown, expected?: unknown, m?: string) => {
      try {
        fn();
      } catch (e) {
        if (!matchesExpected(e, expected)) fail(m, `The error did not match the expected validation: ${format(e)}`);
        return;
      }
      fail(typeof expected === 'string' ? expected : m, 'Missing expected exception.');
    },
    doesNotThrow: (fn: () => unknown, m?: string) => {
      try {
        fn();
      } catch (e) {
        fail(m, `Got unwanted exception: ${e instanceof Error ? e.message : format(e)}`);
      }
    },
    rejects: async (p: Promise<unknown> | (() => Promise<unknown>), expected?: unknown, m?: string) => {
      try {
        await (typeof p === 'function' ? p() : p);
      } catch (e) {
        if (!matchesExpected(e, expected)) fail(m, `The error did not match the expected validation: ${format(e)}`);
        return;
      }
      fail(m, 'Missing expected rejection.');
    },
  });
  (assert as unknown as Record<string, unknown>).strict = assert;
  return assert;
}
