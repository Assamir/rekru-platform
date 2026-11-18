/**
 * Lokalny runner Java – tylko dla `npm run dev` z JAVA_RUNNER=local.
 * Kompiluje Main.java lokalnym `javac` i uruchamia `java` z limitem czasu.
 * Zwraca odpowiedź w tym samym formacie co Judge0, więc frontend nie widzi różnicy.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RunRequest, RunResponse } from '../functions/_lib/runner';

function exec(cmd: string, args: string[], cwd: string, timeoutMs: number) {
  return new Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }>((resolve) => {
    const child = spawn(cmd, args, { cwd });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', () => {
      // komunikat JVM o zmiennych środowiskowych to szum dla kandydata
      stderr = stderr.replace(/^Picked up (_JAVA_OPTIONS|JAVA_TOOL_OPTIONS|JDK_JAVA_OPTIONS):.*\n?/gm, '');
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: String(err), timedOut });
    });
  });
}

export async function runJavaLocally(req: RunRequest): Promise<RunResponse> {
  const dir = await mkdtemp(join(tmpdir(), 'rekru-java-'));
  const started = Date.now();
  try {
    await writeFile(join(dir, 'Main.java'), req.source, 'utf8');
    const base = { stdout: '', stderr: '', compileOutput: '', message: '', memoryKb: null };
    const javac = await exec('javac', ['-encoding', 'UTF-8', '-nowarn', 'Main.java'], dir, 30_000);
    if (javac.code !== 0) {
      return { ...base, ok: false, status: 'Compilation Error', statusId: 6, compileOutput: javac.stderr + javac.stdout, timeSec: null };
    }
    const java = await exec('java', ['-Xmx256m', '-Dfile.encoding=UTF-8', 'Main'], dir, 10_000);
    const timeSec = (Date.now() - started) / 1000;
    if (java.timedOut) {
      return { ...base, ok: false, status: 'Time Limit Exceeded', statusId: 5, stdout: java.stdout, stderr: java.stderr, timeSec };
    }
    if (java.code !== 0) {
      return { ...base, ok: false, status: 'Runtime Error (NZEC)', statusId: 11, stdout: java.stdout, stderr: java.stderr, timeSec };
    }
    return { ...base, ok: true, status: 'Accepted', statusId: 3, stdout: java.stdout, stderr: java.stderr, timeSec };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
