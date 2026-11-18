/**
 * Składa pliki .java kandydata w jeden plik Main.java, który można skompilować
 * poleceniem `javac Main.java` (tak działa Judge0 i większość sandboxów):
 *  - usuwa `package`, przenosi `import` na górę (bez duplikatów),
 *  - zamienia importy JUnit 5 / AssertJ na wbudowany shim (JUnit-lite),
 *  - zdejmuje `public` z typów najwyższego poziomu,
 *  - dokleja runner `public class Main`.
 * Zwraca też mapę linii, żeby błędy kompilacji i stack trace wskazywały
 * oryginalne pliki (np. CartTest.java:12 zamiast Main.java:87).
 */
import SHIM from './JUnitLite.java?raw';
import LOGGING_SHIM from './LoggingLite.java?raw';

export interface SourceFile {
  path: string;
  content: string;
}

export interface LineOrigin {
  file: string;
  line: number;
}

export interface JavaProgram {
  source: string;
  lineMap: (LineOrigin | null)[];
  classNames: string[];
}

export class JavaBuildError extends Error {}

const ASSERT_NAMES = new Set([
  'assertEquals', 'assertNotEquals', 'assertTrue', 'assertFalse', 'assertNull', 'assertNotNull',
  'assertSame', 'assertNotSame', 'assertArrayEquals', 'assertIterableEquals', 'assertThrows',
  'assertDoesNotThrow', 'assertAll', 'assertInstanceOf', 'fail', 'assertThat', 'assertThatThrownBy',
  'assertThatCode', 'assertThatExceptionOfType', 'assertThatIllegalArgumentException',
  'assertThatIllegalStateException', 'assertThatNullPointerException',
]);
const ARGUMENT_NAMES = new Set(['arguments', 'of']);

const RESERVED_TYPES = new Set([
  'Main', 'Assertions', 'Test', 'BeforeEach', 'AfterEach', 'BeforeAll', 'AfterAll', 'Disabled', 'DisplayName',
  'Tag', 'Tags', 'ParameterizedTest', 'RepeatedTest', 'ValueSource', 'CsvSource', 'MethodSource', 'NullSource',
  'EmptySource', 'Executable', 'ThrowingCallable', 'Arguments', 'AssertionFailedError', 'AbstractAssert',
  'ObjectAssert', 'BooleanAssert', 'StringAssert', 'NumberAssert', 'IterableAssert', 'MapAssert',
  'OptionalAssert', 'ThrowableAssert', 'NotThrownAssert', 'ExceptionTypeAssert', '__JUnitLiteRunner',
]);

const SHIMMED_PACKAGES = /^(org\.junit|org\.assertj|org\.opentest4j|org\.slf4j|org\.apache\.logging\.log4j|ch\.qos\.logback)\b/;
const LOGGING_PACKAGES = /^(org\.slf4j|org\.apache\.logging\.log4j|ch\.qos\.logback)\b/;
const LOGGING_TYPES = ['Logger', 'LoggerFactory', 'LogManager'];
const QUALIFIED_PREFIX = /\b(?:org\.junit\.jupiter\.params\.provider|org\.junit\.jupiter\.params|org\.junit\.jupiter\.api|org\.assertj\.core\.api|org\.opentest4j|org\.slf4j|org\.apache\.logging\.log4j)\./g;
const CALL_KEYWORDS = new Set(['return', 'else', 'throw', 'case', 'yield', 'do', 'assert']);

type Segment = { kind: 'code' | 'string' | 'comment'; text: string };

/** Dzieli źródło Java na kod / literały / komentarze. */
export function segmentJava(src: string): Segment[] {
  const out: Segment[] = [];
  let i = 0;
  let codeStart = 0;
  const push = (kind: Segment['kind'], from: number, to: number) => {
    if (to > from) out.push({ kind, text: src.slice(from, to) });
  };
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    let end = -1;
    let kind: Segment['kind'] | null = null;
    if (c === '/' && n === '/') {
      end = src.indexOf('\n', i);
      if (end === -1) end = src.length;
      kind = 'comment';
    } else if (c === '/' && n === '*') {
      end = src.indexOf('*/', i + 2);
      end = end === -1 ? src.length : end + 2;
      kind = 'comment';
    } else if (c === '"' && src.startsWith('"""', i)) {
      end = src.indexOf('"""', i + 3);
      while (end !== -1 && src[end - 1] === '\\') end = src.indexOf('"""', end + 1);
      end = end === -1 ? src.length : end + 3;
      kind = 'string';
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== '\n') {
        if (src[j] === '\\') j++;
        j++;
      }
      end = Math.min(j + 1, src.length);
      kind = 'string';
    }
    if (kind) {
      push('code', codeStart, i);
      push(kind, i, end);
      i = end;
      codeStart = i;
    } else {
      i++;
    }
  }
  push('code', codeStart, src.length);
  return out;
}

interface FileAnalysis {
  body: string;
  imports: { text: string; line: number }[];
  staticAssertNames: Set<string>;
  staticArgumentNames: Set<string>;
  classNames: string[];
  usesLogging: boolean;
}

function analyzeFile(file: SourceFile): FileAnalysis {
  const lines = file.content.replace(/\r\n?/g, '\n').split('\n');
  const imports: FileAnalysis['imports'] = [];
  const staticAssertNames = new Set<string>();
  const staticArgumentNames = new Set<string>();
  let usesLogging = /\b(org\.slf4j|org\.apache\.logging\.log4j)\./.test(file.content);

  const kept = lines.map((line, idx) => {
    const pkg = /^\s*package\s+[\w.]+\s*;\s*$/.exec(line);
    if (pkg) return '';
    const imp = /^\s*import\s+(static\s+)?([\w.]+(?:\.\*)?)\s*;\s*(\/\/.*)?$/.exec(line);
    if (!imp) return line;
    const isStatic = !!imp[1];
    const target = imp[2];
    if (SHIMMED_PACKAGES.test(target)) {
      if (LOGGING_PACKAGES.test(target)) usesLogging = true;
      if (isStatic) {
        const member = target.slice(target.lastIndexOf('.') + 1);
        const owner = target.slice(0, target.lastIndexOf('.'));
        if (/\.Arguments$/.test(owner)) {
          if (member === '*') ARGUMENT_NAMES.forEach((n) => staticArgumentNames.add(n));
          else if (ARGUMENT_NAMES.has(member)) staticArgumentNames.add(member);
        } else if (member === '*') {
          ASSERT_NAMES.forEach((n) => staticAssertNames.add(n));
        } else if (ASSERT_NAMES.has(member)) {
          staticAssertNames.add(member);
        }
      }
      return '';
    }
    imports.push({ text: `import ${isStatic ? 'static ' : ''}${target};`, line: idx + 1 });
    return '';
  });

  const segments = segmentJava(kept.join('\n'));
  let depth = 0;
  const classNames: string[] = [];
  let lastToken = '';
  let lastSignificantChar = '';

  const transformed = segments.map((seg) => {
    if (seg.kind === 'string') {
      lastToken = '"';
      lastSignificantChar = '"';
    }
    if (seg.kind !== 'code') return seg.text;
    let text = seg.text.replace(QUALIFIED_PREFIX, '');
    let result = '';
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (/[A-Za-z_$]/.test(ch)) {
        let j = i + 1;
        while (j < text.length && /[\w$]/.test(text[j])) j++;
        const word = text.slice(i, j);

        if (depth === 0 && word === 'public') {
          const rest = text.slice(j);
          if (/^\s+(?:(?:abstract|final|sealed|non-sealed|strictfp|static)\s+)*(?:class|interface|enum|record|@\s*interface)\b/.test(rest)) {
            result += ' '.repeat(word.length);
            i = j;
            lastToken = word;
            continue;
          }
        }
        if (depth === 0 && /^(class|interface|enum|record)$/.test(word) && lastSignificantChar !== '.' && lastSignificantChar !== '@') {
          const m = /^\s+([A-Za-z_$][\w$]*)/.exec(text.slice(j));
          if (m) classNames.push(m[1]);
        }

        const after = /^\s*\(/.test(text.slice(j));
        const isCallContext =
          lastSignificantChar !== '.' &&
          (!/[\w$\]>]/.test(lastSignificantChar) || CALL_KEYWORDS.has(lastToken) || lastToken === '->');
        if (after && isCallContext && staticAssertNames.has(word)) {
          result += 'Assertions.' + word;
        } else if (after && isCallContext && staticArgumentNames.has(word)) {
          result += 'Arguments.' + word;
        } else {
          result += word;
        }
        lastToken = word;
        lastSignificantChar = word[word.length - 1];
        i = j;
        continue;
      }
      if (ch === '{') depth++;
      if (ch === '}') depth = Math.max(0, depth - 1);
      if (!/\s/.test(ch)) {
        if (ch === '>' && text[i - 1] === '-') lastToken = '->';
        else lastToken = ch;
        lastSignificantChar = ch;
      }
      result += ch;
      i++;
    }
    return result;
  });

  return { body: transformed.join(''), imports, staticAssertNames, staticArgumentNames, classNames, usesLogging };
}

export function buildJavaProgram(files: SourceFile[]): JavaProgram {
  const javaFiles = files.filter((f) => f.path.endsWith('.java'));
  if (javaFiles.length === 0) throw new JavaBuildError('Brak plików .java do skompilowania.');

  const analyses = javaFiles.map((f) => ({ file: f, a: analyzeFile(f) }));
  const usesLogging = analyses.some(({ a }) => a.usesLogging);
  const reserved = new Set([...RESERVED_TYPES, ...(usesLogging ? LOGGING_TYPES : [])]);
  const classNames: string[] = [];
  for (const { file, a } of analyses) {
    for (const name of a.classNames) {
      if (reserved.has(name)) {
        throw new JavaBuildError(
          `${file.path}: nazwa typu „${name}” jest zarezerwowana przez platformę (runner testów). Zmień nazwę klasy.`,
        );
      }
      if (classNames.includes(name)) {
        throw new JavaBuildError(`Typ „${name}” jest zdefiniowany w więcej niż jednym pliku.`);
      }
      classNames.push(name);
    }
  }

  const out: string[] = [];
  const lineMap: (LineOrigin | null)[] = [];
  const seenImports = new Set<string>();
  for (const { file, a } of analyses) {
    for (const imp of a.imports) {
      if (seenImports.has(imp.text)) continue;
      seenImports.add(imp.text);
      out.push(imp.text);
      lineMap.push({ file: file.path, line: imp.line });
    }
  }
  for (const { file, a } of analyses) {
    const lines = a.body.split('\n');
    lines.forEach((l, idx) => {
      out.push(l);
      lineMap.push({ file: file.path, line: idx + 1 });
    });
  }
  const shim = usesLogging ? `${SHIM}\n${LOGGING_SHIM}` : SHIM;
  for (const l of shim.replace(/\r\n?/g, '\n').split('\n')) {
    out.push(l);
    lineMap.push(null);
  }
  const names = classNames.map((n) => JSON.stringify(n)).join(', ');
  out.push(`public class Main { public static void main(String[] args) throws Throwable { __JUnitLiteRunner.run(new String[]{${names}}); } }`);
  lineMap.push(null);

  return { source: out.join('\n') + '\n', lineMap, classNames };
}

/** Podmienia odwołania „Main.java:123” na oryginalne „Plik.java:45”. */
export function remapJavaOutput(text: string, lineMap: (LineOrigin | null)[]): string {
  if (!text) return text;
  return text.replace(/\bMain\.java:(\d+)/g, (whole, num: string) => {
    const origin = lineMap[parseInt(num, 10) - 1];
    return origin ? `${origin.file}:${origin.line}` : '(platforma)';
  });
}
