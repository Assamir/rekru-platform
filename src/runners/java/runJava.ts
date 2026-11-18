import { HttpError, runOnJudge0, type RunResponse } from '../../../functions/_lib/runner';
import { loadConfig, STATIC_FALLBACK } from '../../lib/config';
import type { RunResult } from '../types';
import { buildJavaProgram, JavaBuildError, remapJavaOutput } from './buildProgram';
import { kindFromStatus, parseJavacErrors, parseJavaStdout } from './parseOutput';

export interface RunFile {
  path: string;
  content: string;
}

export async function runJava(files: RunFile[], accessCode?: string): Promise<RunResult> {
  const started = performance.now();
  const base = { tests: [], console: [], diagnostics: [], engine: 'Java (Judge0)' };
  const elapsed = () => Math.round(performance.now() - started);

  let program;
  try {
    program = buildJavaProgram(files);
  } catch (e) {
    if (e instanceof JavaBuildError) return { ...base, kind: 'compile-error', errorText: e.message, durationMs: elapsed() };
    throw e;
  }

  const serverConfig = await loadConfig();
  const config = serverConfig ?? STATIC_FALLBACK;
  const engine = `Java · ${config.engine}`;
  const fail = (errorText: string): RunResult => ({ ...base, engine, kind: 'infra-error', errorText, durationMs: elapsed() });

  const viaProxy = async (): Promise<RunResponse | RunResult> => {
    let res: Response;
    try {
      res = await fetch('/api/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ language: 'java', source: program.source, accessCode }),
      });
    } catch (e) {
      return fail(`Brak połączenia z serwerem: ${(e as Error).message}`);
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      return fail(body?.error ?? `HTTP ${res.status}`);
    }
    return (await res.json()) as RunResponse;
  };

  let outcome: RunResponse | RunResult;
  if (config.mode === 'direct') {
    try {
      outcome = await runOnJudge0(
        { language: 'java', source: program.source },
        { JUDGE0_URL: config.judge0Url, JAVA_LANGUAGE_ID: String(config.javaLanguageId) },
        (input, init) => fetch(input, init),
      );
    } catch (e) {
      if (e instanceof HttpError) outcome = fail(e.message);
      // błąd sieci / CORS – spróbuj przez funkcję Cloudflare, jeśli jest dostępna
      else if (serverConfig) outcome = await viaProxy();
      else outcome = fail(`Nie udało się połączyć z kompilatorem (${config.engine}): ${(e as Error).message}`);
    }
  } else {
    outcome = await viaProxy();
  }
  if ('kind' in outcome) return outcome;
  const data = outcome;
  const parsed = parseJavaStdout(data.stdout, program.lineMap);
  const kind = kindFromStatus(data.statusId, parsed);
  const consoleLines = [...parsed.console];
  if (data.stderr) consoleLines.push(...remapJavaOutput(data.stderr, program.lineMap).replace(/\n$/, '').split('\n').map((text) => ({ level: 'stderr' as const, text })));

  if (kind === 'compile-error') {
    const diagnostics = parseJavacErrors(data.compileOutput, program.lineMap);
    return { ...base, engine, kind, diagnostics, errorText: remapJavaOutput(data.compileOutput, program.lineMap), durationMs: elapsed() };
  }
  let errorText: string | undefined;
  if (kind === 'timeout') errorText = 'Przekroczono limit czasu wykonania (możliwa nieskończona pętla).';
  else if (kind === 'runtime-error') errorText = `${data.status}${data.message ? ': ' + data.message : ''}`;
  else if (kind === 'infra-error') errorText = `Błąd środowiska wykonawczego: ${data.status} ${data.message}`;
  return { ...base, engine, kind, tests: parsed.tests, console: consoleLines, errorText, durationMs: elapsed() };
}
