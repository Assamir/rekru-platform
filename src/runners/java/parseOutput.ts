import type { ConsoleLine, Diagnostic, RunKind, TestResult, TestStatus } from '../types';
import { remapJavaOutput, type LineOrigin } from './buildProgram';

const b64 = (s: string) => {
  if (!s) return '';
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

export interface ParsedJavaOutput {
  mode: 'tests' | 'program' | 'no-tests' | 'unknown';
  tests: TestResult[];
  console: ConsoleLine[];
  done: boolean;
}

export function parseJavaStdout(stdout: string, lineMap: (LineOrigin | null)[]): ParsedJavaOutput {
  const tests: TestResult[] = [];
  const console: ConsoleLine[] = [];
  let mode: ParsedJavaOutput['mode'] = 'unknown';
  let done = false;
  const lines = stdout.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  for (const line of lines) {
    if (line.startsWith('@@JLT\t')) {
      const [, status, cls, name, ms, msg] = line.split('\t');
      mode = 'tests';
      tests.push({
        status: status.toLowerCase() as TestStatus,
        suite: b64(cls),
        name: b64(name),
        durationMs: parseInt(ms, 10) || 0,
        message: remapJavaOutput(b64(msg ?? ''), lineMap) || undefined,
      });
    } else if (line.startsWith('@@JLT_DONE\t')) {
      done = true;
    } else if (line.startsWith('@@JLT_MODE\t')) {
      mode = line.split('\t')[1] === 'MAIN' ? 'program' : 'no-tests';
    } else {
      console.push({ level: 'stdout', text: line });
    }
  }
  return { mode, tests, console, done };
}

const PKG_HINT = /package ([\w.]+) does not exist|pakiet ([\w.]+) nie istnieje/;

function hintFor(message: string): string {
  const m = PKG_HINT.exec(message);
  if (!m) return message;
  return `${message} — biblioteka spoza zestawu dostępnego w darmowym trybie (JUnit 5, AssertJ, SLF4J/Log4j, JDK).`;
}

/** javac: "Main.java:12: error: ..." → diagnostyki w oryginalnych plikach. */
export function parseJavacErrors(compileOutput: string, lineMap: (LineOrigin | null)[]): Diagnostic[] {
  const diags: Diagnostic[] = [];
  const re = /^Main\.java:(\d+): (?:error|błąd): (.*)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(compileOutput))) {
    const origin = lineMap[parseInt(m[1], 10) - 1];
    diags.push({
      file: origin?.file ?? '(platforma)',
      line: origin?.line ?? 0,
      column: 1,
      message: hintFor(m[2]),
    });
  }
  return diags;
}

export function kindFromStatus(statusId: number, parsed: ParsedJavaOutput): RunKind {
  if (statusId === 6) return 'compile-error';
  if (statusId === 5) return 'timeout';
  if (statusId >= 7 && statusId <= 12) return parsed.done ? 'tests' : 'runtime-error';
  if (statusId === 13 || statusId === 14) return 'infra-error';
  if (parsed.mode === 'program') return 'program';
  if (parsed.mode === 'no-tests') return 'no-tests';
  return 'tests';
}
