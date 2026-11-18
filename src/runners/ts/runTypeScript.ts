import { monaco, modelUri } from '../../lib/monaco';
import type { ConsoleLine, Diagnostic, RunResult, TestResult } from '../types';
import type { RunMessage, WorkerEvent } from './tsRunner.worker';
import TsRunnerWorker from './tsRunner.worker?worker';

export interface RunFile {
  path: string;
  content: string;
}

const TOTAL_TIMEOUT_MS = 30_000;

type TsDiagnostic = { start?: number; messageText: string | { messageText: string; next?: unknown[] }; category: number; file?: unknown };

function flatten(msg: TsDiagnostic['messageText'], indent = 0): string {
  if (typeof msg === 'string') return msg;
  const head = '  '.repeat(indent) + msg.messageText;
  const next = (msg.next as TsDiagnostic['messageText'][] | undefined) ?? [];
  return [head, ...next.map((n) => flatten(n, indent + 1))].join('\n');
}

export async function collectTypeScriptDiagnostics(paths: string[]): Promise<Diagnostic[]> {
  const uris = paths.map(modelUri);
  const getWorker = await monaco.typescript.getTypeScriptWorker();
  const client = await getWorker(...uris);
  const out: Diagnostic[] = [];
  for (const uri of uris) {
    const model = monaco.editor.getModel(uri);
    if (!model) continue;
    const fileName = uri.toString();
    const diags = [
      ...((await client.getSyntacticDiagnostics(fileName)) as TsDiagnostic[]),
      ...((await client.getSemanticDiagnostics(fileName)) as TsDiagnostic[]),
    ];
    for (const d of diags) {
      if (d.category !== 1) continue;
      const pos = model.getPositionAt(d.start ?? 0);
      out.push({ file: uri.path.slice(1), line: pos.lineNumber, column: pos.column, message: flatten(d.messageText) });
    }
  }
  return out;
}

async function emit(paths: string[]): Promise<Record<string, string>> {
  const getWorker = await monaco.typescript.getTypeScriptWorker();
  const client = await getWorker(...paths.map(modelUri));
  const out: Record<string, string> = {};
  for (const path of paths) {
    const result = await client.getEmitOutput(modelUri(path).toString());
    const js = result.outputFiles.find((f) => f.name.endsWith('.js'));
    if (js) out[path] = js.text;
  }
  return out;
}

export async function runTypeScript(
  files: RunFile[],
  opts: { packages: Record<string, string>; onProgress?: (r: TestResult) => void },
): Promise<RunResult> {
  const started = performance.now();
  const base = { tests: [] as TestResult[], console: [] as ConsoleLine[], diagnostics: [] as Diagnostic[], engine: 'TypeScript w przeglądarce' };
  const codePaths = files.filter((f) => /\.tsx?$/.test(f.path) && !f.path.endsWith('.d.ts')).map((f) => f.path);

  const diagnostics = await collectTypeScriptDiagnostics(files.filter((f) => /\.tsx?$/.test(f.path)).map((f) => f.path));
  const sources = await emit(codePaths);

  for (const f of files.filter((x) => x.path.endsWith('.json') && !/(^|\/)(package|tsconfig)\.json$/.test(x.path))) {
    try {
      JSON.parse(f.content);
      sources[f.path] = `module.exports = ${f.content};`;
    } catch (e) {
      diagnostics.push({ file: f.path, line: 1, column: 1, message: `Niepoprawny JSON: ${(e as Error).message}` });
    }
  }
  if (diagnostics.length > 0) {
    return { ...base, kind: 'compile-error', diagnostics, durationMs: Math.round(performance.now() - started) };
  }

  const testFiles = codePaths.filter((p) => /\.(test|spec)\.tsx?$/.test(p));
  const tests: TestResult[] = [];
  const consoleLines: ConsoleLine[] = [];
  const worker = new TsRunnerWorker();
  let running: { suite: string; name: string } | null = null;

  return new Promise<RunResult>((resolve) => {
    const finish = (r: Partial<RunResult> & Pick<RunResult, 'kind'>) => {
      clearTimeout(watchdog);
      worker.terminate();
      resolve({ ...base, tests, console: consoleLines, durationMs: Math.round(performance.now() - started), ...r });
    };
    const watchdog = setTimeout(() => {
      const where = running ? ` (test „${running.name}”)` : '';
      if (running) tests.push({ ...running, status: 'error', durationMs: TOTAL_TIMEOUT_MS, message: 'Przerwano – prawdopodobnie nieskończona pętla.' });
      finish({ kind: 'timeout', errorText: `Przekroczono łączny limit czasu ${TOTAL_TIMEOUT_MS / 1000} s${where}.` });
    }, TOTAL_TIMEOUT_MS);

    worker.onmessage = (ev: MessageEvent<WorkerEvent>) => {
      const e = ev.data;
      if (e.type === 'console') consoleLines.push({ level: e.level, text: e.text });
      else if (e.type === 'start') running = { suite: e.suite, name: e.name };
      else if (e.type === 'result') {
        running = null;
        tests.push(e.result);
        opts.onProgress?.(e.result);
      } else if (e.type === 'done') finish({ kind: e.mode === 'program' ? 'program' : tests.length ? 'tests' : 'no-tests' });
      else if (e.type === 'fatal') finish({ kind: 'runtime-error', errorText: e.message });
    };
    worker.onerror = (ev) => {
      ev.preventDefault();
      finish({ kind: 'runtime-error', errorText: ev.message || 'Błąd workera.' });
    };
    const msg: RunMessage = { type: 'run', sources, testFiles, packages: opts.packages };
    worker.postMessage(msg);
  });
}
