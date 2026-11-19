import { readFileSync, rmSync } from 'node:fs';
import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { buildIdeProject, IDE_VERSIONS, ideProjectName, LOGBACK_PATTERN, type IdeFile } from '../src/lib/ideProject';
import { zipIdeProject } from '../src/lib/ideZip';
import { parseTask, type Task } from '../src/lib/task';
import { ideE2eRequested, run, runGradleTest, writeProject } from './helpers/ideTools';

const gradleWrapperJar = new Uint8Array(readFileSync('public/ide/gradle-wrapper.jar'));
const javaTask = parseTask(readFileSync('examples/java-koszt-dostawy-parametryzowane.md', 'utf8'));
const cartTask = parseTask(readFileSync('examples/java-koszyk-testy.md', 'utf8'));
const tsTask = parseTask(readFileSync('examples/typescript-walidator-hasel.md', 'utf8'));
const tsMockTask = parseTask(readFileSync('examples/typescript-klient-api-mock.md', 'utf8'));

const text = (files: IdeFile[], path: string) => {
  const f = files.find((x) => x.path === path);
  if (!f) throw new Error(`Brak pliku ${path} w paczce: ${files.map((x) => x.path).join(', ')}`);
  return typeof f.content === 'string' ? f.content : strFromU8(f.content);
};

describe('buildIdeProject – Java', () => {
  const files = buildIdeProject(cartTask, cartTask.files, { gradleWrapperJar });
  const paths = files.map((f) => f.path);

  it('układa projekt Gradle: klasy w main, testy w test, wrapper, logback', () => {
    expect(paths).toEqual(
      expect.arrayContaining([
        'src/main/java/Cart.java',
        'src/test/java/CartTest.java',
        'src/test/resources/logback.xml',
        'build.gradle',
        'settings.gradle',
        'gradlew',
        'gradlew.bat',
        'gradle/wrapper/gradle-wrapper.jar',
        'gradle/wrapper/gradle-wrapper.properties',
        '.gitignore',
        'README.md',
      ]),
    );
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('build.gradle: poziom języka 17, JUnit 5, AssertJ, SLF4J + Logback, log testów na konsoli', () => {
    const gradle = text(files, 'build.gradle');
    expect(gradle).toContain('options.release = 17');
    expect(gradle).toContain("org.junit:junit-bom:");
    expect(gradle).toContain('org.junit.platform:junit-platform-launcher');
    expect(gradle).toContain('org.assertj:assertj-core:');
    expect(gradle).toContain('org.slf4j:slf4j-api:');
    expect(gradle).toContain('ch.qos.logback:logback-classic:');
    expect(gradle).toContain('useJUnitPlatform()');
    expect(gradle).toContain('onOutput {');
    expect(gradle).toContain("event.message.replaceFirst(/\\r?\\n$/, '')");
    expect(gradle).not.toContain('toolchain');
    expect(gradle).not.toContain('log4j');
    expect(text(files, 'gradle/wrapper/gradle-wrapper.properties')).toContain(`gradle-${IDE_VERSIONS.gradle}-bin.zip`);
  });

  it('logback ma nazwę wątku „Test worker” wpisaną na stałe', () => {
    expect(LOGBACK_PATTERN).toBe('%d{HH:mm:ss.SSS} [Test worker] %-5level %logger{36} - %msg%n');
    expect(text(files, 'src/test/resources/logback.xml')).toContain(LOGBACK_PATTERN);
  });

  it('gradlew jest wykonywalny i ma końce linii LF, gradlew.bat – CRLF, jar jest binarny', () => {
    const gradlew = files.find((f) => f.path === 'gradlew')!;
    expect(gradlew.executable).toBe(true);
    expect(gradlew.content).not.toContain('\r');
    expect(text(files, 'gradlew.bat')).toContain('\r\n');
    expect(files.find((f) => f.path === 'gradle/wrapper/gradle-wrapper.jar')!.content).toBe(gradleWrapperJar);
  });

  it('README zawiera opis zadania, wymagania i komendę uruchomienia', () => {
    const readme = text(files, 'README.md');
    expect(readme).toContain(cartTask.description.trim());
    expect(readme).toContain('JDK 17');
    expect(readme).toContain('gradlew test');
  });

  it('pomija pliki budowania z zadania (szablon wygrywa) i wspomina o tym w README', () => {
    const f = buildIdeProject(javaTask, javaTask.files, { gradleWrapperJar });
    expect(javaTask.files.some((x) => x.path === 'build.gradle')).toBe(true);
    expect(text(f, 'build.gradle')).toContain('options.release = 17');
    expect(text(f, 'README.md')).toContain('`build.gradle`');
    expect(f.filter((x) => x.path === 'build.gradle')).toHaveLength(1);
  });

  it('używa bieżących plików kandydata, usuwa `package`, dołącza pliki ukryte i dane', () => {
    const task: Task = { ...cartTask, title: 'Żółw – łączenie' };
    const current = [
      { path: 'model/Cart.java', content: 'package com.shop.model;\n\npublic class Cart { int n = 2; }\n', readonly: true, hidden: false },
      { path: 'CartTest.java', content: 'import org.junit.jupiter.api.Test;\nclass CartTest { @Test void mine() {} }\n', readonly: false, hidden: false },
      { path: 'HiddenTest.java', content: 'import org.junit.jupiter.api.Test;\nclass HiddenTest { @Test void h() {} }\n', readonly: true, hidden: true },
      { path: 'TestSupport.java', content: 'import static org.assertj.core.api.Assertions.assertThat;\nclass TestSupport {}\n', readonly: true, hidden: false },
      { path: 'data/cases.csv', content: 'a,b\r\n1,2\r\n', readonly: true, hidden: false },
      { path: 'LogDemo.java', content: 'import org.apache.logging.log4j.LogManager;\nclass LogDemo {}\n', readonly: true, hidden: false },
    ];
    const f = buildIdeProject(task, current, { gradleWrapperJar });
    expect(text(f, 'src/main/java/Cart.java')).toBe('\n\npublic class Cart { int n = 2; }\n');
    expect(text(f, 'src/test/java/CartTest.java')).toContain('void mine()');
    expect(text(f, 'src/test/java/HiddenTest.java')).toContain('void h()');
    expect(text(f, 'src/test/java/TestSupport.java')).toContain('TestSupport');
    expect(text(f, 'src/test/resources/data/cases.csv')).toBe('a,b\n1,2\n');
    expect(text(f, 'build.gradle')).toContain('log4j-to-slf4j');
    expect(text(f, 'settings.gradle')).toBe("rootProject.name = 'zolw-laczenie-java'\n");
    expect(ideProjectName(task)).toBe('zolw-laczenie-java');
  });

  it('bez gradle-wrapper.jar zgłasza czytelny błąd', () => {
    expect(() => buildIdeProject(cartTask)).toThrow(/gradle-wrapper\.jar/);
  });
});

describe('buildIdeProject – TypeScript', () => {
  const files = buildIdeProject(tsTask);
  const paths = files.map((f) => f.path);

  it('układa projekt npm z Vitest: pliki pod swoimi ścieżkami + konfiguracja', () => {
    expect(paths).toEqual(
      expect.arrayContaining([...tsTask.files.map((f) => f.path), 'package.json', 'tsconfig.json', 'vitest.config.ts', '.gitignore', 'README.md']),
    );
    expect(new Set(paths).size).toBe(paths.length);
    expect(ideProjectName(tsTask)).toMatch(/-ts$/);
  });

  it('package.json: npm test = vitest run, wersje narzędzi jak w platformie', () => {
    const pkg = JSON.parse(text(files, 'package.json'));
    const platform = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.scripts.test).toBe('vitest run');
    expect(pkg.type).toBe('module');
    expect(pkg.devDependencies.vitest).toBe(platform.devDependencies.vitest);
    expect(pkg.devDependencies.typescript).toBe(platform.devDependencies.typescript);
    expect(IDE_VERSIONS.vitest).toBe(platform.devDependencies.vitest);
    expect(IDE_VERSIONS.typescript).toBe(platform.devDependencies.typescript);
  });

  it('vitest: globalne describe/test/expect i konsola bez nagłówków', () => {
    const config = text(files, 'vitest.config.ts');
    expect(config).toContain('globals: true');
    expect(config).toContain('disableConsoleIntercept: true');
    expect(JSON.parse(text(files, 'tsconfig.json')).compilerOptions.types).toContain('vitest/globals');
  });

  it('scala package.json i tsconfig.json z zadania', () => {
    const current = [
      { path: 'package.json', content: JSON.stringify({ dependencies: { zod: '^3.23.0' }, devDependencies: { jest: '^29.0.0', typescript: '~5.4.0' }, scripts: { lint: 'tsc' } }), readonly: true, hidden: false },
      { path: 'tsconfig.json', content: JSON.stringify({ compilerOptions: { strict: true, noUnusedLocals: true, types: ['node'] } }), readonly: true, hidden: false },
      { path: 'src/a.test.ts', content: "test('x', () => { const f = jest.fn(); f(); expect(f).toHaveBeenCalled(); });\n", readonly: false, hidden: false },
    ];
    const f = buildIdeProject(tsTask, current);
    const pkg = JSON.parse(text(f, 'package.json'));
    expect(pkg.dependencies).toEqual({ zod: '^3.23.0' });
    expect(pkg.devDependencies).toEqual({ typescript: '~5.4.0', vitest: IDE_VERSIONS.vitest });
    expect(pkg.scripts).toMatchObject({ lint: 'tsc', test: 'vitest run' });
    expect(JSON.parse(text(f, 'tsconfig.json')).compilerOptions).toEqual({ strict: true, noUnusedLocals: true, types: ['node', 'vitest/globals'] });
    expect(text(f, 'vitest.config.ts')).toContain("setupFiles: ['./vitest.setup.ts']");
    expect(text(f, 'vitest.setup.ts')).toContain('jest = vi');
    expect(f.filter((x) => x.path === 'package.json')).toHaveLength(1);
  });

  it('README zawiera opis zadania, wymagania i komendy', () => {
    const readme = text(files, 'README.md');
    expect(readme).toContain(tsTask.description.trim());
    expect(readme).toContain('Node.js 20');
    expect(readme).toContain('npm test');
  });
});

describe('zipIdeProject', () => {
  it('pakuje pliki do jednego katalogu, gradlew z bitem wykonywalności', () => {
    const files = buildIdeProject(cartTask, cartTask.files, { gradleWrapperJar });
    const zip = zipIdeProject(files, 'koszyk-java');
    const entries = unzipSync(zip);
    expect(Object.keys(entries).sort()).toEqual(files.map((f) => `koszyk-java/${f.path}`).sort());
    expect(strFromU8(entries['koszyk-java/src/main/java/Cart.java'])).toBe(text(files, 'src/main/java/Cart.java'));
    expect(entries['koszyk-java/gradle/wrapper/gradle-wrapper.jar']).toEqual(gradleWrapperJar);

    // Atrybuty zewnętrzne z centralnego katalogu ZIP: system = Unix (3), tryb pliku w górnych 16 bitach.
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    const modes: Record<string, number> = {};
    for (let i = 0; i + 46 <= zip.length; i++) {
      if (view.getUint32(i, true) !== 0x02014b50) continue;
      const nameLen = view.getUint16(i + 28, true);
      const name = strFromU8(zip.subarray(i + 46, i + 46 + nameLen));
      expect(view.getUint8(i + 5)).toBe(3);
      modes[name] = view.getUint32(i + 38, true) >>> 16;
    }
    expect(modes['koszyk-java/gradlew']).toBe(0o100755);
    expect(modes['koszyk-java/build.gradle']).toBe(0o100644);
  });
});

// ------------------------------------------------------------------ test integracyjny (prawdziwy Gradle / npm)
// Wolny i wymaga internetu, więc tylko na życzenie: `npm run test:ide` (albo zmienna IDE_E2E=1).

const e2e = ideE2eRequested;

const LOG_LINE = /^\d\d:\d\d:\d\d\.\d{3} \[Test worker\] INFO  /;

describe.skipIf(!e2e)('paczka do IDE – prawdziwe narzędzia', () => {
  it('Java: `gradlew test` kompiluje, uruchamia testy i wypisuje log we wzorcu logback', () => {
    const dir = writeProject(buildIdeProject(javaTask, javaTask.files, { gradleWrapperJar }));
    try {
      const r = runGradleTest(dir);
      console.log(r.output);
      expect(r.output).toContain('BUILD SUCCESSFUL');
      expect(r.status).toBe(0);
      expect(r.output).toMatch(/ShippingCalculatorTest > .* PASSED/);
      // Linie logu bez wcięć i nagłówków Gradle – tak samo jak w konsoli platformy.
      const logLines = r.output.split(/\r?\n/).filter((l) => LOG_LINE.test(l));
      expect(logLines.some((l) => /^\d\d:\d\d:\d\d\.\d{3} \[Test worker\] INFO  ShippingCalculatorTest - Przypadek: PL \/ 0\.5$/.test(l))).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 20 * 60_000);

  it('TypeScript: `npm install && npm test` uruchamia testy, console.log bez nagłówków Vitest', () => {
    const logger = `export function getLogger(name: string) {
  const line = (level: string, msg: string) => console.log(\`12:00:00.000 [Test worker] \${level.padEnd(5)} \${name} - \${msg}\`);
  return { info: (msg: string) => line('INFO', msg), error: (msg: string) => line('ERROR', msg) };
}
`;
    const test = `import { getLogger } from './logger';
const logger = getLogger('SmokeTest');
describe('SmokeTest', () => {
  test('logs', () => {
    logger.info('hello 1');
    const spy = jest.fn();
    spy();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
`;
    const extra = [
      { path: 'logger.ts', content: logger, readonly: true, hidden: false },
      { path: 'smoke.test.ts', content: test, readonly: false, hidden: false },
    ];
    const dir = writeProject(buildIdeProject(tsMockTask, [...tsMockTask.files, ...extra]));
    try {
      const install = run('npm', ['install', '--no-audit', '--no-fund'], dir);
      if (install.status !== 0) console.log(install.output);
      expect(install.status).toBe(0);
      const r = run('npm', ['test'], dir);
      console.log(r.output);
      expect(r.status).toBe(0);
      expect(r.output.split(/\r?\n/)).toContain('12:00:00.000 [Test worker] INFO  SmokeTest - hello 1');
      expect(r.output).not.toMatch(/stdout \| /);
      const tsc = run('npx', ['tsc', '--noEmit', '-p', '.'], dir);
      if (tsc.status !== 0) console.log(tsc.output);
      expect(tsc.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 20 * 60_000);
});
