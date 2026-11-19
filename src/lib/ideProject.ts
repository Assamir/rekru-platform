/**
 * Paczka do IDE: zamienia zadanie (z bieżącym kodem kandydata) w zwykły projekt,
 * który da się otworzyć w IntelliJ / VS Code i uruchomić prawdziwymi narzędziami:
 *  - Java: Gradle z wrapperem, JUnit 5, AssertJ, SLF4J + Logback (poziom języka 17 – jak na platformie),
 *  - TypeScript: npm + Vitest.
 * Funkcja jest czysta (bez DOM) – ZIP i pobieranie są w ideZip.ts.
 */
import { fileRole, isTestFile, type Task, type TaskFile } from './task';
import GRADLEW from './ideTemplates/gradlew.txt?raw';
import GRADLEW_BAT from './ideTemplates/gradlew.bat.txt?raw';

export interface IdeFile {
  path: string;
  content: string | Uint8Array;
  /** Bit wykonywalności w ZIP-ie (gradlew). */
  executable?: boolean;
}

export interface IdeAssets {
  /** Zawartość gradle/wrapper/gradle-wrapper.jar (public/ide/gradle-wrapper.jar). Wymagana dla zadań Java. */
  gradleWrapperJar?: Uint8Array;
}

/** Wersje narzędzi w paczce. Vitest i TypeScript – takie same jak w package.json platformy (pilnuje tego test). */
export const IDE_VERSIONS = {
  gradle: '9.9.0',
  java: 17,
  junit: '5.11.4',
  assertj: '3.27.3',
  slf4j: '2.0.17',
  logback: '1.5.18',
  log4j: '2.24.3',
  vitest: '^5.1.1',
  typescript: '^7.0.2',
  node: 20,
} as const;

/** Nazwa wątku wpisana na stałe – tak samo nazywa go Gradle i runner platformy. */
export const LOGBACK_PATTERN = '%d{HH:mm:ss.SSS} [Test worker] %-5level %logger{36} - %msg%n';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Nazwa katalogu projektu i pliku ZIP (bez rozszerzenia): tytuł zadania + język. */
export function ideProjectName(task: Pick<Task, 'title' | 'language'>): string {
  return `${slugify(task.title) || 'zadanie'}-${task.language === 'java' ? 'java' : 'ts'}`;
}

const lf = (s: string) => s.replace(/\r\n?/g, '\n');
const crlf = (s: string) => lf(s).replace(/\n/g, '\r\n');
const baseName = (path: string) => path.split('/').pop() ?? path;

export function buildIdeProject(task: Task, files: TaskFile[] = task.files, assets: IdeAssets = {}): IdeFile[] {
  return task.language === 'java' ? javaProject(task, files, assets) : typeScriptProject(task, files);
}

// ------------------------------------------------------------------- Java

const PACKAGE_LINE = /^[ \t]*package\s+[\w.]+\s*;[ \t]*$/m;

function javaProject(task: Task, files: TaskFile[], assets: IdeAssets): IdeFile[] {
  if (!assets.gradleWrapperJar) throw new Error('Brak pliku gradle-wrapper.jar – nie można zbudować projektu Gradle.');
  const name = ideProjectName(task);
  const out: IdeFile[] = [];
  const skipped: string[] = [];
  const usesLog4j = files.some((f) => /\borg\.apache\.logging\.log4j\b/.test(f.content));

  for (const f of files) {
    const role = fileRole('java', f.path);
    if (role === 'code') {
      // Platforma ignoruje `package` (wszystko jest w pakiecie domyślnym) – tu tak samo, żeby wynik był zgodny.
      const content = lf(f.content).replace(PACKAGE_LINE, '');
      const isTest = isTestFile(task, f) || /^\s*import\s+(static\s+)?org\.(junit|assertj)\b/m.test(f.content);
      out.push({ path: `src/${isTest ? 'test' : 'main'}/java/${baseName(f.path)}`, content });
    } else if (role === 'config') {
      skipped.push(f.path);
    } else {
      out.push({ path: `src/test/resources/${f.path}`, content: lf(f.content) });
    }
  }

  const add = (path: string, content: string | Uint8Array, executable?: boolean) => {
    if (!out.some((o) => o.path === path)) out.push({ path, content, executable });
  };
  add('src/test/resources/logback.xml', LOGBACK_XML);
  add('build.gradle', buildGradle(usesLog4j));
  add('settings.gradle', `rootProject.name = '${name}'\n`);
  add('gradlew', lf(GRADLEW), true);
  add('gradlew.bat', crlf(GRADLEW_BAT));
  add('gradle/wrapper/gradle-wrapper.jar', assets.gradleWrapperJar);
  add('gradle/wrapper/gradle-wrapper.properties', GRADLE_WRAPPER_PROPERTIES);
  add('.gitignore', '.gradle/\nbuild/\nout/\n.idea/\n*.iml\n.vscode/\n');
  add('README.md', javaReadme(task, skipped));
  return out;
}

const GRADLE_WRAPPER_PROPERTIES = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-${IDE_VERSIONS.gradle}-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;

const LOGBACK_XML = `<configuration>
    <!-- Same pattern as the platform console. The thread name is fixed, so the log looks
         the same from Gradle, IntelliJ and VS Code. -->
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>${LOGBACK_PATTERN}</pattern>
        </encoder>
    </appender>

    <root level="DEBUG">
        <appender-ref ref="STDOUT"/>
    </root>
</configuration>
`;

function buildGradle(usesLog4j: boolean): string {
  const log4j = usesLog4j
    ? `
    implementation 'org.apache.logging.log4j:log4j-api:${IDE_VERSIONS.log4j}'
    testRuntimeOnly 'org.apache.logging.log4j:log4j-to-slf4j:${IDE_VERSIONS.log4j}'`
    : '';
  return `plugins {
    id 'java'
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.slf4j:slf4j-api:${IDE_VERSIONS.slf4j}'${log4j}

    testImplementation platform('org.junit:junit-bom:${IDE_VERSIONS.junit}')
    testImplementation 'org.junit.jupiter:junit-jupiter'
    testImplementation 'org.assertj:assertj-core:${IDE_VERSIONS.assertj}'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
    testRuntimeOnly 'ch.qos.logback:logback-classic:${IDE_VERSIONS.logback}'
}

// Same language level as the online platform (Java ${IDE_VERSIONS.java}), whatever JDK runs the build.
tasks.withType(JavaCompile).configureEach {
    options.release = ${IDE_VERSIONS.java}
    options.encoding = 'UTF-8'
}

test {
    useJUnitPlatform()
    systemProperty 'file.encoding', 'UTF-8'
    // Always run the tests, even when nothing has changed.
    outputs.upToDateWhen { false }
    testLogging {
        events 'passed', 'failed', 'skipped'
        exceptionFormat = 'full'
    }
    // Print the test output (logger, System.out) as plain lines, exactly as on the online platform.
    onOutput { descriptor, event ->
        logger.lifecycle(event.message.replaceFirst(/\\r?\\n$/, ''))
    }
}
`;
}

function javaReadme(task: Task, skipped: string[]): string {
  return `${task.description.trim()}

---

## Running this project locally

Requirements: **JDK ${IDE_VERSIONS.java} or newer** and internet access on the first run
(the Gradle wrapper downloads Gradle ${IDE_VERSIONS.gradle} and the libraries from Maven Central).

\`\`\`
./gradlew test          # Linux / macOS
gradlew.bat test        # Windows
\`\`\`

- IntelliJ IDEA: *File → Open* and choose this folder (it is imported as a Gradle project), then run a test class.
- VS Code: open this folder with the *Extension Pack for Java* installed, then use the Testing view or the command above.
- Code is compiled at the Java ${IDE_VERSIONS.java} language level, the same as on the online platform.
- Tests: \`src/test/java\`, other classes: \`src/main/java\` (default package). Libraries: JUnit 5, AssertJ, SLF4J + Logback.
- Log lines use the pattern \`HH:mm:ss.SSS [Test worker] LEVEL Logger - message\` (\`src/test/resources/logback.xml\`).
${skipped.length ? `- Build files from the task (${skipped.map((s) => `\`${s}\``).join(', ')}) were replaced by the build files of this project.\n` : ''}`;
}

// ------------------------------------------------------------------- TypeScript

const DEFAULT_TSCONFIG = {
  compilerOptions: {
    target: 'ES2022',
    module: 'ESNext',
    moduleResolution: 'bundler',
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    resolveJsonModule: true,
    types: ['vitest/globals'],
  },
  include: ['**/*.ts', '**/*.tsx'],
  exclude: ['node_modules'],
};

function parseJson(text: string): Record<string, unknown> | null {
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

const record = (v: unknown): Record<string, string> => (v && typeof v === 'object' ? (v as Record<string, string>) : {});

function typeScriptProject(task: Task, files: TaskFile[]): IdeFile[] {
  const name = ideProjectName(task);
  const out: IdeFile[] = [];
  let taskPkg: Record<string, unknown> | null = null;
  let tsconfig: string | null = null;

  for (const f of files) {
    if (f.path === 'package.json') taskPkg = parseJson(f.content) ?? {};
    else if (f.path === 'tsconfig.json') tsconfig = tsconfigWithVitestTypes(f.content);
    else out.push({ path: f.path, content: lf(f.content) });
  }

  const usesJestGlobal = files.some((f) => fileRole('typescript', f.path) === 'code' && /\bjest\.\w+\(/.test(f.content));
  const devDependencies: Record<string, string> = { typescript: IDE_VERSIONS.typescript, ...record(taskPkg?.devDependencies), vitest: IDE_VERSIONS.vitest };
  for (const tool of ['jest', 'ts-jest', '@types/jest', '@jest/globals']) delete devDependencies[tool];
  const pkg = {
    ...(taskPkg ?? {}),
    name,
    version: '1.0.0',
    private: true,
    type: 'module',
    scripts: { ...record(taskPkg?.scripts), test: 'vitest run', 'test:watch': 'vitest' },
    dependencies: record(taskPkg?.dependencies),
    devDependencies,
  };

  const add = (path: string, content: string) => {
    if (!out.some((o) => o.path === path)) out.push({ path, content });
  };
  add('package.json', JSON.stringify(pkg, null, 2) + '\n');
  add('tsconfig.json', tsconfig ?? JSON.stringify(DEFAULT_TSCONFIG, null, 2) + '\n');
  add('vitest.config.ts', vitestConfig(usesJestGlobal));
  if (usesJestGlobal) add('vitest.setup.ts', VITEST_SETUP);
  add('.gitignore', 'node_modules/\ndist/\n.vscode/\n.idea/\n');
  add('README.md', typeScriptReadme(task));
  return out;
}

function tsconfigWithVitestTypes(content: string): string {
  const json = parseJson(content);
  if (!json) return lf(content); // np. komentarze w pliku – zostaje bez zmian
  const options = { ...(json.compilerOptions as Record<string, unknown> | undefined) };
  const types = Array.isArray(options.types) ? (options.types as string[]) : [];
  options.types = [...new Set([...types, 'vitest/globals'])];
  return JSON.stringify({ ...json, compilerOptions: options }, null, 2) + '\n';
}

function vitestConfig(withSetup: boolean): string {
  return `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // describe / it / test / expect / vi without imports, like on the online platform.
    globals: true,
    include: ['**/*.{test,spec}.{ts,tsx}'],${withSetup ? "\n    setupFiles: ['./vitest.setup.ts']," : ''}
    // Print console output as plain lines (no "stdout | file > test" headers).
    disableConsoleIntercept: true,
  },
});
`;
}

const VITEST_SETUP = `import { vi } from 'vitest';

// The online platform also accepts jest.fn() / jest.spyOn(); map them to Vitest.
declare global {
  // eslint-disable-next-line no-var
  var jest: typeof vi;
}
globalThis.jest = vi;
`;

function typeScriptReadme(task: Task): string {
  return `${task.description.trim()}

---

## Running this project locally

Requirements: **Node.js ${IDE_VERSIONS.node} or newer** and internet access on the first run (npm downloads Vitest and TypeScript).

\`\`\`
npm install
npm test
\`\`\`

- \`npm run test:watch\` re-runs the tests after every change.
- VS Code / IntelliJ: open this folder; the *Vitest* extension or plugin can run single tests from the editor.
- Tests are the \`*.test.ts\` / \`*.spec.ts\` files. \`describe\`, \`test\`, \`it\`, \`expect\` and \`vi\` are available without imports.
`;
}
