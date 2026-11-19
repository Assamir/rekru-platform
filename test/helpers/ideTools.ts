/**
 * Wspólne narzędzia testów integracyjnych paczki do IDE: zapis wygenerowanego projektu
 * na dysk i uruchomienie prawdziwego Gradle / npm. Wolne i wymagają internetu, więc
 * testy, które ich używają, działają tylko na życzenie: `npm run test:ide` albo IDE_E2E=1.
 */
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { IdeFile } from '../../src/lib/ideProject';

export const ideE2eRequested = process.env.IDE_E2E === '1' || process.env.npm_lifecycle_event === 'test:ide';
export const isWindows = process.platform === 'win32';

export function writeProject(files: IdeFile[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'rekru-ide-'));
  for (const f of files) {
    const target = join(dir, f.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, f.content);
    if (f.executable && !isWindows) chmodSync(target, 0o755);
  }
  return dir;
}

export function run(cmd: string, args: string[], cwd: string) {
  const options = { cwd, encoding: 'utf8' as const, timeout: 15 * 60_000, env: { ...process.env, CI: '1', NO_COLOR: '1', FORCE_COLOR: '0' } };
  // W Windows .bat / npm.cmd wymagają powłoki; polecenie jako jeden napis (argumenty są stałe, bez spacji).
  const r = isWindows ? spawnSync([cmd, ...args].join(' '), { ...options, shell: true }) : spawnSync(cmd, args, options);
  return { status: r.status, output: `${r.stdout ?? ''}\n${r.stderr ?? ''}` };
}

/** `gradlew test` bez procesu Gradle w tle i z małą stertą. */
export function runGradleTest(dir: string) {
  return run(isWindows ? `"${join(dir, 'gradlew.bat')}"` : './gradlew', ['test', '--no-daemon', '--console=plain', '-Dorg.gradle.jvmargs=-Xmx384m'], dir);
}
