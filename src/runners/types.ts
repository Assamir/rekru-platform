export type TestStatus = 'passed' | 'failed' | 'error' | 'skipped';

export interface TestResult {
  suite: string;
  name: string;
  status: TestStatus;
  durationMs: number;
  message?: string;
}

export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug' | 'stdout' | 'stderr';

export interface ConsoleLine {
  level: ConsoleLevel;
  text: string;
}

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  message: string;
}

export type RunKind =
  | 'tests'
  | 'program'
  | 'no-tests'
  | 'compile-error'
  | 'runtime-error'
  | 'timeout'
  | 'infra-error';

export interface RunResult {
  kind: RunKind;
  tests: TestResult[];
  console: ConsoleLine[];
  diagnostics: Diagnostic[];
  /** Surowy tekst błędu kompilacji / środowiska. */
  errorText?: string;
  durationMs: number;
  engine: string;
}

export function summarize(tests: TestResult[]) {
  return {
    total: tests.length,
    passed: tests.filter((t) => t.status === 'passed').length,
    failed: tests.filter((t) => t.status === 'failed' || t.status === 'error').length,
    skipped: tests.filter((t) => t.status === 'skipped').length,
  };
}
