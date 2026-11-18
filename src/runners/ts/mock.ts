/** vi.fn() / jest.fn() / vi.spyOn() – podzbiór API zgodny z Vitest i Jest. */

type AnyFn = (...args: any[]) => any;

export interface MockState {
  calls: unknown[][];
  results: { type: 'return' | 'throw'; value: unknown }[];
  instances: unknown[];
  lastCall: unknown[] | undefined;
}

export interface MockFn extends AnyFn {
  _isMockFunction: true;
  mock: MockState;
  [key: string]: any;
}

const registry = new Set<MockFn>();

export function isMock(v: unknown): v is MockFn {
  return typeof v === 'function' && (v as MockFn)._isMockFunction === true;
}

export function fn(implementation?: AnyFn): MockFn {
  let impl = implementation;
  let once: AnyFn[] = [];
  let name = 'vi.fn()';
  let restore: (() => void) | undefined;
  const state: MockState = { calls: [], results: [], instances: [], lastCall: undefined };

  const mock = function (this: unknown, ...args: unknown[]) {
    state.calls.push(args);
    state.lastCall = args;
    state.instances.push(this);
    const f = once.length ? once.shift() : impl;
    try {
      const value = f ? f.apply(this, args) : undefined;
      state.results.push({ type: 'return', value });
      return value;
    } catch (e) {
      state.results.push({ type: 'throw', value: e });
      throw e;
    }
  } as MockFn;

  const api = {
    _isMockFunction: true as const,
    mock: state,
    getMockName: () => name,
    mockName: (n: string) => ((name = n), mock),
    getMockImplementation: () => impl,
    mockImplementation: (f: AnyFn) => ((impl = f), mock),
    mockImplementationOnce: (f: AnyFn) => (once.push(f), mock),
    mockReturnValue: (v: unknown) => ((impl = () => v), mock),
    mockReturnValueOnce: (v: unknown) => (once.push(() => v), mock),
    mockResolvedValue: (v: unknown) => ((impl = () => Promise.resolve(v)), mock),
    mockResolvedValueOnce: (v: unknown) => (once.push(() => Promise.resolve(v)), mock),
    mockRejectedValue: (e: unknown) => ((impl = () => Promise.reject(e)), mock),
    mockRejectedValueOnce: (e: unknown) => (once.push(() => Promise.reject(e)), mock),
    mockReturnThis: () => ((impl = function (this: unknown) { return this; }), mock),
    mockClear: () => {
      state.calls = [];
      state.results = [];
      state.instances = [];
      state.lastCall = undefined;
      return mock;
    },
    mockReset: () => {
      api.mockClear();
      impl = undefined;
      once = [];
      return mock;
    },
    mockRestore: () => {
      api.mockReset();
      restore?.();
    },
    __setRestore: (r: () => void) => {
      restore = r;
    },
  };
  Object.assign(mock, api);
  // mock.calls itp. muszą zawsze wskazywać na aktualne tablice
  Object.defineProperty(mock, 'mock', { get: () => state });
  registry.add(mock);
  return mock;
}

export function spyOn<T extends object>(obj: T, key: keyof T, accessType?: 'get' | 'set'): MockFn {
  if (accessType) {
    const desc = Object.getOwnPropertyDescriptor(obj, key) ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(obj), key);
    if (!desc) throw new Error(`Nie można szpiegować nieistniejącej właściwości ${String(key)}`);
    const original = desc[accessType] as AnyFn;
    const m = fn(original);
    Object.defineProperty(obj, key, { ...desc, [accessType]: m, configurable: true });
    m.__setRestore(() => Object.defineProperty(obj, key, desc));
    return m;
  }
  const original = obj[key] as unknown;
  if (typeof original !== 'function') {
    throw new Error(`vi.spyOn: właściwość ${String(key)} nie jest funkcją (typ: ${typeof original})`);
  }
  const m = fn(function (this: unknown, ...args: unknown[]) {
    return (original as AnyFn).apply(this, args);
  });
  m.mockName(String(key));
  (obj as Record<PropertyKey, unknown>)[key as PropertyKey] = m;
  m.__setRestore(() => {
    (obj as Record<PropertyKey, unknown>)[key as PropertyKey] = original;
  });
  return m;
}

export function createVi() {
  return {
    fn,
    spyOn,
    isMockFunction: isMock,
    mocked: <T>(v: T) => v,
    clearAllMocks: () => registry.forEach((m) => m.mockClear()),
    resetAllMocks: () => registry.forEach((m) => m.mockReset()),
    restoreAllMocks: () => registry.forEach((m) => m.mockRestore()),
  };
}
