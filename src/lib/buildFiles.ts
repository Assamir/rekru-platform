/**
 * Analiza plików budowania dołączonych do zadania:
 *  - Java: build.gradle / build.gradle.kts / pom.xml → lista zależności i ostrzeżenia
 *    o bibliotekach niedostępnych w darmowym trybie (Judge0, jeden plik).
 *  - TypeScript: package.json → paczki npm ładowane w przeglądarce z esm.sh,
 *    tsconfig.json → wybrane opcje kompilatora.
 */
import type { TaskFile } from './task';

export interface Dependency {
  group?: string;
  name: string;
  version?: string;
  scope: string;
  source: string;
}

export interface DependencyStatus extends Dependency {
  supported: boolean;
  note: string;
}

// ------------------------------------------------------------------- Java

const GRADLE_CONFIGS =
  'implementation|testImplementation|api|compileOnly|runtimeOnly|testRuntimeOnly|testCompileOnly|annotationProcessor|testAnnotationProcessor|compile|testCompile';

export function parseGradleDependencies(content: string, source = 'build.gradle'): Dependency[] {
  const deps: Dependency[] = [];
  const noComments = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  const re = new RegExp(`\\b(${GRADLE_CONFIGS})\\s*\\(?\\s*(?:platform\\s*\\(\\s*)?["']([^"':\\s]+):([^"':\\s]+)(?::([^"'\\s]+))?["']`, 'g');
  for (const m of noComments.matchAll(re)) {
    deps.push({ scope: m[1], group: m[2], name: m[3], version: m[4], source });
  }
  const mapRe = new RegExp(`\\b(${GRADLE_CONFIGS})\\s*\\(?\\s*group\\s*[:=]\\s*["']([^"']+)["']\\s*,\\s*name\\s*[:=]\\s*["']([^"']+)["'](?:\\s*,\\s*version\\s*[:=]\\s*["']([^"']+)["'])?`, 'g');
  for (const m of noComments.matchAll(mapRe)) {
    deps.push({ scope: m[1], group: m[2], name: m[3], version: m[4], source });
  }
  return deps;
}

export function parsePomDependencies(content: string, source = 'pom.xml'): Dependency[] {
  const deps: Dependency[] = [];
  const noComments = content.replace(/<!--[\s\S]*?-->/g, '');
  const tag = (block: string, name: string) => new RegExp(`<${name}>\\s*([^<]+?)\\s*</${name}>`).exec(block)?.[1];
  for (const m of noComments.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)) {
    const block = m[1];
    const name = tag(block, 'artifactId');
    if (!name) continue;
    deps.push({ group: tag(block, 'groupId'), name, version: tag(block, 'version'), scope: tag(block, 'scope') ?? 'compile', source });
  }
  return deps;
}

const JAVA_SUPPORTED: { test: (d: Dependency) => boolean; note: string }[] = [
  { test: (d) => /^org\.junit(\.jupiter|\.platform)?$/.test(d.group ?? ''), note: 'JUnit 5 – wbudowany (JUnit-lite)' },
  { test: (d) => d.group === 'org.assertj', note: 'AssertJ – wbudowany (podzbiór API)' },
  { test: (d) => d.group === 'org.slf4j', note: 'SLF4J – wbudowany logger (wypisuje na konsolę)' },
  { test: (d) => d.group === 'ch.qos.logback', note: 'Logback – zastąpiony wbudowanym loggerem' },
  { test: (d) => d.group === 'org.apache.logging.log4j', note: 'Log4j 2 – wbudowany logger (wypisuje na konsolę)' },
  { test: (d) => d.group === 'org.projectlombok', note: 'Lombok – niedostępny (adnotacje nie zostaną przetworzone)' },
];

export function analyzeJavaDependencies(files: Pick<TaskFile, 'path' | 'content'>[]): DependencyStatus[] {
  const deps: Dependency[] = [];
  for (const f of files) {
    const name = f.path.split('/').pop() ?? '';
    if (/^build\.gradle(\.kts)?$/.test(name)) deps.push(...parseGradleDependencies(f.content, f.path));
    if (name === 'pom.xml') deps.push(...parsePomDependencies(f.content, f.path));
  }
  return deps.map((d) => {
    const rule = JAVA_SUPPORTED.find((r) => r.test(d));
    const supported = !!rule && d.group !== 'org.projectlombok';
    return { ...d, supported, note: rule?.note ?? 'niedostępna w darmowym trybie (Judge0) – kod używający tej biblioteki się nie skompiluje' };
  });
}

// ------------------------------------------------------------------- TypeScript

/** Paczki obsługiwane przez wbudowane środowisko testowe lub niepotrzebne w przeglądarce. */
const TS_BUILTIN = /^(vitest|jest|@jest\/.+|@vitest\/.+|ts-jest|typescript|ts-node|tsx|@types\/.+|eslint.*|@typescript-eslint\/.+|prettier|husky|lint-staged|vite|esbuild|nodemon|rimraf|cross-env|dotenv)$/;
const TS_UNSUPPORTED = /^(@playwright\/test|playwright(-core)?|puppeteer(-core)?|selenium-webdriver|webdriverio|@wdio\/.+|cypress|supertest|express|fastify|pg|mysql2?|mongodb|mongoose|sqlite3|better-sqlite3)$/;

export interface NpmPackage {
  name: string;
  range: string;
  url?: string;
  supported: boolean;
  note: string;
}

export function analyzePackageJson(content: string): { packages: NpmPackage[]; error?: string } {
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(content);
  } catch (e) {
    return { packages: [], error: `package.json nie jest poprawnym JSON-em: ${(e as Error).message}` };
  }
  const all: Record<string, string> = {
    ...((json.devDependencies as Record<string, string>) ?? {}),
    ...((json.dependencies as Record<string, string>) ?? {}),
  };
  const packages = Object.entries(all).map(([name, range]): NpmPackage => {
    if (TS_BUILTIN.test(name)) return { name, range, supported: true, note: 'wbudowane / niepotrzebne w przeglądarce' };
    if (TS_UNSUPPORTED.test(name)) return { name, range, supported: false, note: 'wymaga Node.js lub przeglądarki sterowanej z zewnątrz – nie zadziała w tym środowisku' };
    if (/^(file:|link:|git|https?:|workspace:)/.test(range)) return { name, range, supported: false, note: 'lokalne / git-owe źródło nie jest obsługiwane' };
    const version = range === '*' || range === 'latest' || range === '' ? '' : `@${range.replace(/\s+/g, '')}`;
    return { name, range, url: `https://esm.sh/${name}${version}`, supported: true, note: 'ładowana z esm.sh' };
  });
  return { packages };
}

/** Mapa nazwa → URL dla workera + deklaracje typów (any) dla edytora. */
export function cdnPackages(packages: NpmPackage[]) {
  const map: Record<string, string> = {};
  for (const p of packages) if (p.url) map[p.name] = p.url;
  const dts = Object.keys(map)
    .map((n) => `declare module '${n}' { const value: any; export = value; }\ndeclare module '${n}/*';`)
    .join('\n');
  return { map, dts };
}

export interface TsConfigOptions {
  strict?: boolean;
  noImplicitAny?: boolean;
  strictNullChecks?: boolean;
  noUnusedLocals?: boolean;
  noUnusedParameters?: boolean;
  exactOptionalPropertyTypes?: boolean;
  noImplicitReturns?: boolean;
  experimentalDecorators?: boolean;
}

/** Usuwa komentarze (poza stringami) i końcowe przecinki – format JSONC jak w tsconfig.json. */
export function stripJsonc(src: string): string {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j += src[j] === '\\' ? 2 : 1;
      out += src.slice(i, j + 1);
      i = j;
    } else if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      i = end === -1 ? src.length : end + 1;
    } else out += c;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

export function readTsConfig(content: string): TsConfigOptions {
  try {
    const json = JSON.parse(stripJsonc(content));
    const co = (json.compilerOptions ?? {}) as Record<string, unknown>;
    const keys: (keyof TsConfigOptions)[] = [
      'strict', 'noImplicitAny', 'strictNullChecks', 'noUnusedLocals', 'noUnusedParameters',
      'exactOptionalPropertyTypes', 'noImplicitReturns', 'experimentalDecorators',
    ];
    const out: TsConfigOptions = {};
    for (const k of keys) if (typeof co[k] === 'boolean') out[k] = co[k] as boolean;
    return out;
  } catch {
    return {};
  }
}
