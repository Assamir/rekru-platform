import { describe, expect, it } from 'vitest';
import { analyzeJavaDependencies, analyzePackageJson, cdnPackages, readTsConfig } from '../src/lib/buildFiles';

describe('build files', () => {
  it('czyta zależności z build.gradle (Groovy i Kotlin DSL)', () => {
    const deps = analyzeJavaDependencies([
      {
        path: 'build.gradle',
        content: `dependencies {\n  testImplementation platform('org.junit:junit-bom:5.10.2')\n  testImplementation 'org.junit.jupiter:junit-jupiter'\n  testImplementation("org.assertj:assertj-core:3.25.3")\n  implementation 'org.slf4j:slf4j-api:2.0.13'\n  // implementation 'x:y:1'\n  testImplementation 'io.rest-assured:rest-assured:5.4.0'\n}`,
      },
    ]);
    expect(deps.map((d) => [d.name, d.supported])).toEqual([
      ['junit-bom', true],
      ['junit-jupiter', true],
      ['assertj-core', true],
      ['slf4j-api', true],
      ['rest-assured', false],
    ]);
  });

  it('czyta pom.xml', () => {
    const deps = analyzeJavaDependencies([
      { path: 'pom.xml', content: '<project><dependencies><dependency><groupId>org.mockito</groupId><artifactId>mockito-core</artifactId><version>5.0.0</version><scope>test</scope></dependency></dependencies></project>' },
    ]);
    expect(deps).toMatchObject([{ name: 'mockito-core', scope: 'test', supported: false }]);
  });

  it('package.json → paczki z esm.sh', () => {
    const { packages } = analyzePackageJson(JSON.stringify({ dependencies: { zod: '^3.23.8', dayjs: 'latest' }, devDependencies: { vitest: '^2', '@playwright/test': '1.47.0' } }));
    const byName = Object.fromEntries(packages.map((p) => [p.name, p]));
    expect(byName.zod.url).toBe('https://esm.sh/zod@^3.23.8');
    expect(byName.dayjs.url).toBe('https://esm.sh/dayjs');
    expect(byName.vitest.url).toBeUndefined();
    expect(byName['@playwright/test'].supported).toBe(false);
    expect(cdnPackages(packages).dts).toContain("declare module 'zod'");
    expect(analyzePackageJson('{').error).toBeTruthy();
  });

  it('tsconfig.json z komentarzami', () => {
    expect(readTsConfig('{ // c\n "compilerOptions": { "strict": false, "target": "es5", },\n}')).toEqual({ strict: false });
  });
});
