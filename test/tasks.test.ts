/**
 * Stan początkowy zadań rekrutacyjnych z katalogu tasks/ (D-024):
 *  - SC-1: każde zadanie startuje z tym samym wynikiem testów co w repo JavaWorldTest,
 *  - SC-2: log zadania „Test refactoring” zgadza się co do znaku (poza czasem)
 *    z blokiem EXPECTED RESULTS w opisie – w Javie i w TypeScript.
 *  - SC-3: paczka do IDE daje ten sam wynik testów i ten sam log co platforma.
 * Java jest składana przez buildJavaProgram i uruchamiana lokalnym JDK (jak na Judge0),
 * TypeScript jest kompilowany przez tsc z opcjami platformy i uruchamiany jej harnessem.
 * Na żądanie te same oczekiwania są sprawdzane na Judge0 (`npm run test:judge0`)
 * i w projektach wygenerowanych dla IDE, uruchomionych przez Gradle i npm (`npm run test:ide`).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { buildIdeProject } from '../src/lib/ideProject';
import { parseTask, type Task } from '../src/lib/task';
import { runOnJudge0 } from '../functions/_lib/runner';
import { buildJavaProgram, type JavaProgram } from '../src/runners/java/buildProgram';
import { parseJavaStdout } from '../src/runners/java/parseOutput';
import { createHarness } from '../src/runners/ts/harness';
import { createModuleSystem } from '../src/runners/ts/moduleSystem';
import type { TestResult } from '../src/runners/types';
import { ideE2eRequested, run, runGradleTest, writeProject } from './helpers/ideTools';

const TASKS_DIR = 'tasks';
const TEST_GLOBALS = readFileSync('src/runners/ts/test-globals.d.ts.txt', 'utf8');
const hasJavac = spawnSync('javac', ['-version']).status === 0;

const taskFiles = readdirSync(TASKS_DIR).filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md').sort();
const loadTask = (file: string): Task => parseTask(readFileSync(join(TASKS_DIR, file), 'utf8'), file);

interface Outcome {
  tests: Pick<TestResult, 'suite' | 'name' | 'status'>[];
  log: string[];
}

const TIME = /^\d\d:\d\d:\d\d\.\d{3} /;
const maskTime = (line: string) => line.replace(TIME, 'HH:mm:ss.SSS ');
const logLines = (lines: string[]) => lines.filter((l) => TIME.test(l)).map(maskTime);

/** Linie z bloku ```text w opisie zadania (EXPECTED RESULTS). */
function expectedResults(task: Task): string[] {
  const m = /```text\n([\s\S]*?)\n```/.exec(task.description);
  if (!m) throw new Error(`Brak bloku EXPECTED RESULTS w opisie zadania „${task.title}”.`);
  return m[1].split('\n').map(maskTime);
}

function withTempDir<T>(prefix: string, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function runJavaTask(task: Task): Outcome {
  const program = buildJavaProgram(task.files);
  return withTempDir('rekru-task-java-', (dir) => {
    writeFileSync(join(dir, 'Main.java'), program.source);
    const javac = spawnSync('javac', ['-encoding', 'UTF-8', '-nowarn', '--release', '17', 'Main.java'], { cwd: dir, encoding: 'utf8' });
    if (javac.status !== 0) throw new Error(`Błąd kompilacji zadania „${task.title}”:\n${javac.stderr}${javac.stdout}`);
    const run = spawnSync('java', ['-Xms32m', '-Xmx256m', '-Dfile.encoding=UTF-8', 'Main'], { cwd: dir, encoding: 'utf8', timeout: 30_000 });
    return javaOutcome(program, run.stdout, run.stderr);
  });
}

function javaOutcome(program: JavaProgram, stdout: string, stderr: string): Outcome {
  const parsed = parseJavaStdout(stdout.replace(/\r\n/g, '\n'), program.lineMap);
  if (!parsed.done) throw new Error(`Runner nie zakończył pracy:\n${stdout}\n${stderr}`);
  return {
    tests: parsed.tests.map(({ suite, name, status }) => ({ suite, name, status })),
    log: logLines(parsed.console.map((l) => l.text)),
  };
}

/** Ta sama ścieżka co na wdrożeniu: publiczny Judge0 z domyślnym identyfikatorem języka (Java 17). */
async function runJavaTaskOnJudge0(task: Task): Promise<Outcome> {
  const program = buildJavaProgram(task.files);
  const res = await runOnJudge0({ language: 'java', source: program.source }, { JUDGE0_URL: process.env.JUDGE0_URL });
  if (res.statusId === 6) throw new Error(`Błąd kompilacji na Judge0 („${task.title}”):\n${res.compileOutput}`);
  return javaOutcome(program, res.stdout, `${res.status} ${res.stderr} ${res.message}`);
}

/** Kompiluje pliki zadania przez tsc z opcjami kompilatora platformy (src/lib/monaco.ts). */
function compileTypeScriptTask(task: Task): Record<string, string> {
  const codePaths = task.files.filter((f) => /\.tsx?$/.test(f.path)).map((f) => f.path);
  return withTempDir('rekru-task-ts-', (dir) => {
    for (const f of task.files) {
      mkdirSync(dirname(join(dir, f.path)), { recursive: true });
      writeFileSync(join(dir, f.path), f.content);
    }
    mkdirSync(join(dir, '__rekru__'));
    writeFileSync(join(dir, '__rekru__', 'test-globals.d.ts'), TEST_GLOBALS);
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'es2020',
          module: 'commonjs',
          lib: ['es2022', 'dom'],
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          types: [],
          rootDir: '.',
          outDir: '__out__',
        },
        include: ['**/*.ts', '**/*.tsx'],
        exclude: ['__out__'],
      }),
    );
    const tsc = spawnSync(process.execPath, [join(process.cwd(), 'node_modules/typescript/bin/tsc'), '-p', dir], { encoding: 'utf8' });
    if (tsc.status !== 0) throw new Error(`Błąd kompilacji zadania „${task.title}”:\n${tsc.stdout}${tsc.stderr}`);
    const sources: Record<string, string> = {};
    for (const path of codePaths) sources[path] = readFileSync(join(dir, '__out__', path.replace(/\.tsx?$/, '.js')), 'utf8');
    return sources;
  });
}

async function runTypeScriptTask(task: Task): Promise<Outcome> {
  const sources = compileTypeScriptTask(task);
  const tests: Outcome['tests'] = [];
  const printed: string[] = [];
  const harness = createHarness({ onResult: ({ suite, name, status }) => tests.push({ suite, name, status }) });
  const testApi = { ...harness.api, default: harness.api, __esModule: true };
  const modules = createModuleSystem(sources, { vitest: testApi, '@jest/globals': testApi });
  const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => void printed.push(args.map(String).join(' ')));
  try {
    for (const path of Object.keys(sources).filter((p) => /\.(test|spec)\.tsx?$/.test(p))) modules.load(path);
    await harness.run();
  } finally {
    spy.mockRestore();
  }
  return { tests, log: logLines(printed) };
}

/** Ten sam projekt, który pobiera kandydat przyciskiem „Pobierz projekt (IDE)”, uruchomiony przez `gradlew test`. */
function runJavaTaskInIde(task: Task): Outcome {
  const gradleWrapperJar = new Uint8Array(readFileSync('public/ide/gradle-wrapper.jar'));
  const dir = writeProject(buildIdeProject(task, task.files, { gradleWrapperJar }));
  try {
    const { output } = runGradleTest(dir);
    const lines = output.split(/\r?\n/);
    const tests = lines.flatMap((l) => {
      const m = /^(\S+) > (.+) (PASSED|FAILED|SKIPPED)$/.exec(l);
      return m ? [{ suite: m[1], name: m[2], status: m[3].toLowerCase() as TestResult['status'] }] : [];
    });
    if (tests.length === 0) throw new Error(`Gradle nie uruchomił testów zadania „${task.title}”:\n${output}`);
    return { tests, log: logLines(lines) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Projekt npm z paczki do IDE: `npm install` i `npm test` (Vitest), wyniki z raportu JSON. */
function runTypeScriptTaskInIde(task: Task): Outcome {
  const dir = writeProject(buildIdeProject(task));
  try {
    const install = run('npm', ['install', '--no-audit', '--no-fund'], dir);
    if (install.status !== 0) throw new Error(`npm install nie powiódł się („${task.title}”):\n${install.output}`);
    const { output } = run('npm', ['test', '--', '--reporter=json', '--outputFile=vitest-result.json'], dir);
    let report: { testResults: { assertionResults: { ancestorTitles: string[]; title: string; status: string }[] }[] };
    try {
      report = JSON.parse(readFileSync(join(dir, 'vitest-result.json'), 'utf8'));
    } catch {
      throw new Error(`Vitest nie zapisał raportu („${task.title}”):\n${output}`);
    }
    const tests = report.testResults.flatMap((f) =>
      f.assertionResults.map((a) => ({ suite: a.ancestorTitles.join(' > '), name: a.title, status: a.status as TestResult['status'] })),
    );
    return { tests, log: logLines(output.split(/\r?\n/)) };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const statuses = (o: Outcome) => o.tests.map((t) => t.status);
const line = (level: string, logger: string, message: string) => `HH:mm:ss.SSS [Test worker] ${level.padEnd(5)} ${logger} - ${message}`;

describe('zadania w tasks/', () => {
  it('jest komplet: 3 zadania × 2 języki', () => {
    expect(taskFiles).toEqual([
      'java-anagram.md',
      'java-collections.md',
      'java-refactoring.md',
      'typescript-anagram.md',
      'typescript-collections.md',
      'typescript-refactoring.md',
    ]);
  });

  it.each(taskFiles)('%s: bez poziomu i licznika czasu, z edytowalnym plikiem testu', (file) => {
    const task = loadTask(file);
    expect(task.language).toBe(file.startsWith('java-') ? 'java' : 'typescript');
    expect(task.level).toBeUndefined(); // D-021: kandydat nie widzi poziomu
    expect(task.durationMin).toBeUndefined(); // D-022: bez licznika
    expect(task.files.some((f) => !f.readonly && !f.hidden)).toBe(true);
  });

  it('opis i dane są takie same w obu językach', () => {
    for (const name of ['anagram', 'collections', 'refactoring']) {
      const java = loadTask(`java-${name}.md`);
      const ts = loadTask(`typescript-${name}.md`);
      expect(ts.title).toBe(java.title);
      expect(ts.description).toBe(java.description);
    }
  });
});

/**
 * Judge0 jest sprawdzany tylko na żądanie, bo wymaga sieci i ma limity zapytań:
 * `npm run test:judge0` albo zmienna środowiskowa JUDGE0_E2E=1.
 */
const judge0Requested = Boolean(process.env.JUDGE0_E2E) || process.env.npm_lifecycle_event === 'test:judge0';
const ENGINES: { label: string; language: Task['language']; run: (task: Task) => Outcome | Promise<Outcome>; skip: boolean }[] = [
  { label: 'java, lokalny JDK', language: 'java', run: runJavaTask, skip: !hasJavac },
  { label: 'java, Judge0 (npm run test:judge0)', language: 'java', run: runJavaTaskOnJudge0, skip: !judge0Requested },
  { label: 'java, paczka do IDE (npm run test:ide)', language: 'java', run: runJavaTaskInIde, skip: !ideE2eRequested },
  { label: 'typescript', language: 'typescript', run: runTypeScriptTask, skip: false },
  { label: 'typescript, paczka do IDE (npm run test:ide)', language: 'typescript', run: runTypeScriptTaskInIde, skip: !ideE2eRequested },
];

describe.each(ENGINES)('stan początkowy – $label', ({ language, run: runTask, skip }) => {
  const test = it.skipIf(skip);
  const timeout = 20 * 60_000; // paczka do IDE pobiera zależności przy pierwszym uruchomieniu
  const names =
    language === 'java'
      ? { refactoring: 'MyFirstTest', anagram: 'AnagramTest', collections: 'MyCollectionTest' }
      : { refactoring: 'MyFirstTest', anagram: 'AnagramTest', collections: 'CollectionTest' };

  test(
    'refactoring: test przechodzi, log zgodny z EXPECTED RESULTS',
    async () => {
      const task = loadTask(`${language}-refactoring.md`);
      const outcome = await runTask(task);
      expect(outcome.tests).toHaveLength(1);
      expect(outcome.tests[0].suite).toBe(names.refactoring);
      expect(statuses(outcome)).toEqual(['passed']);
      expect(outcome.log).toEqual(expectedResults(task));
      expect(outcome.log).toHaveLength(14);
    },
    timeout,
  );

  test(
    'anagram: 2 z 3 przypadków celowo nie przechodzą',
    async () => {
      const outcome = await runTask(loadTask(`${language}-anagram.md`));
      expect(statuses(outcome)).toEqual(['failed', 'failed', 'passed']);
      expect(outcome.log).toEqual([
        line('INFO', names.anagram, 'Words: restful | fluster'),
        line('INFO', names.anagram, 'Words: cheater | teacher'),
        line('INFO', names.anagram, 'Words: hello | world'),
      ]);
    },
    timeout,
  );

  test(
    'collections: pusty test przechodzi i nic nie loguje',
    async () => {
      const outcome = await runTask(loadTask(`${language}-collections.md`));
      expect(statuses(outcome)).toEqual(['passed']);
      expect(outcome.tests[0].suite).toBe(names.collections);
      expect(outcome.log).toEqual([]);
    },
    timeout,
  );
});
