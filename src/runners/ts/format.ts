/** Czytelne formatowanie wartości w komunikatach asercji i w konsoli. */
export function format(value: unknown, depth = 0, seen: WeakSet<object> = new WeakSet()): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  const t = typeof value;
  if (t === 'string') return JSON.stringify(value);
  if (t === 'number') return Object.is(value, -0) ? '-0' : String(value);
  if (t === 'bigint') return `${value}n`;
  if (t === 'boolean' || t === 'symbol') return String(value);
  if (t === 'function') {
    const fn = value as { name?: string; _isMockFunction?: boolean };
    return fn._isMockFunction ? `[MockFunction${fn.name ? ' ' + fn.name : ''}]` : `[Function ${fn.name || 'anonymous'}]`;
  }
  const obj = value as object;
  if (isAsymmetric(obj)) return obj.toString();
  if (seen.has(obj)) return '[Circular]';
  if (obj instanceof Date) return isNaN(obj.getTime()) ? 'Invalid Date' : obj.toISOString();
  if (obj instanceof RegExp) return String(obj);
  if (obj instanceof Error) return `[${obj.name}: ${obj.message}]`;
  if (depth > 4) return Array.isArray(obj) ? '[Array]' : '[Object]';
  seen.add(obj);
  try {
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      const items = obj.slice(0, 50).map((v) => format(v, depth + 1, seen));
      if (obj.length > 50) items.push(`… +${obj.length - 50}`);
      return `[${items.join(', ')}]`;
    }
    if (obj instanceof Map) {
      return `Map {${[...obj.entries()].map(([k, v]) => `${format(k, depth + 1, seen)} => ${format(v, depth + 1, seen)}`).join(', ')}}`;
    }
    if (obj instanceof Set) return `Set {${[...obj].map((v) => format(v, depth + 1, seen)).join(', ')}}`;
    if (obj instanceof Promise) return 'Promise {}';
    const ctor = Object.getPrototypeOf(obj)?.constructor?.name;
    const prefix = ctor && ctor !== 'Object' ? `${ctor} ` : '';
    const keys = Object.keys(obj);
    if (keys.length === 0) return `${prefix}{}`;
    const body = keys
      .slice(0, 50)
      .map((k) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${format((obj as Record<string, unknown>)[k], depth + 1, seen)}`);
    return `${prefix}{ ${body.join(', ')} }`;
  } finally {
    seen.delete(obj);
  }
}

export interface AsymmetricMatcher {
  asymmetricMatch(other: unknown): boolean;
  toString(): string;
  $$asymmetric: true;
}

export function isAsymmetric(v: unknown): v is AsymmetricMatcher {
  return !!v && typeof v === 'object' && (v as AsymmetricMatcher).$$asymmetric === true;
}

/** Formatowanie argumentów console.log (stringi bez cudzysłowów, jak w Node). */
export function formatConsoleArgs(args: unknown[]): string {
  if (typeof args[0] === 'string' && /%[sdifoOj%]/.test(args[0])) {
    let i = 1;
    const head = (args[0] as string).replace(/%[sdifoOj%]/g, (m) => {
      if (m === '%%') return '%';
      if (i >= args.length) return m;
      const v = args[i++];
      if (m === '%s') return typeof v === 'string' ? v : format(v);
      if (m === '%d' || m === '%i') return String(m === '%i' ? Math.trunc(Number(v)) : Number(v));
      if (m === '%f') return String(Number(v));
      return format(v);
    });
    return [head, ...args.slice(i).map((a) => (typeof a === 'string' ? a : format(a)))].join(' ');
  }
  return args.map((a) => (typeof a === 'string' ? a : format(a))).join(' ');
}
