import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildJavaProgram, JavaBuildError, remapJavaOutput } from '../src/runners/java/buildProgram';
import { parseJavacErrors, parseJavaStdout } from '../src/runners/java/parseOutput';
import { parseTask } from '../src/lib/task';

const hasJavac = spawnSync('javac', ['-version']).status === 0;

function compileAndRun(source: string) {
  const dir = mkdtempSync(join(tmpdir(), 'rekru-test-'));
  try {
    writeFileSync(join(dir, 'Main.java'), source);
    // Poziom języka jak na Judge0 (JDK 17). Mała sterta: JVM nie rezerwuje 1/4 RAM-u, więc testy
    // nie padają na maszynach z prawie wyczerpaną pamięcią wirtualną.
    const javac = spawnSync('javac', ['-J-Xms32m', '-J-Xmx512m', '-encoding', 'UTF-8', '-nowarn', '--release', '17', 'Main.java'], { cwd: dir, encoding: 'utf8' });
    if (javac.status !== 0) return { compiled: false, compileOutput: javac.stderr + javac.stdout, stdout: '', stderr: '' };
    const run = spawnSync('java', ['-Xms16m', '-Xmx256m', 'Main'], { cwd: dir, encoding: 'utf8', timeout: 20_000 });
    return { compiled: true, compileOutput: '', stdout: run.stdout, stderr: run.stderr };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const example = parseTask(readFileSync('examples/java-koszyk-testy.md', 'utf8'));
const cart = example.files.find((f) => f.path === 'Cart.java')!;

const candidateTests = `package com.example.shop;

import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.Arguments;
import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.params.provider.Arguments.arguments;

@DisplayName("Koszyk")
public class CartTest {
    private Cart cart;

    @BeforeEach
    void setUp() { cart = new Cart(); }

    @Test
    @DisplayName("Pusty koszyk = 0")
    void empty() { assertEquals(new BigDecimal("0.00"), cart.total()); }

    @Test
    void zeroQuantityIsRejected() {
        // błąd #1 w implementacji: ilość 0 jest akceptowana
        assertThrows(IllegalArgumentException.class, () -> cart.add("x", BigDecimal.ONE, 0));
    }

    @Test
    void thresholdDiscount() {
        cart.add("a", new BigDecimal("200"), 1);
        // błąd #2: rabat od 200 włącznie
        assertThat(cart.total()).isEqualByComparingTo(new BigDecimal("180"));
    }

    @Test
    void mergesSameProduct() {
        cart.add("a", BigDecimal.TEN, 1);
        cart.add("a", BigDecimal.TEN, 2);
        assertEquals(3, cart.quantityOf("a"));
        assertEquals(1, cart.positions(), "jedna pozycja");
        System.out.println("log z testu: " + cart.total());
    }

    @Test
    void unknownVoucher() {
        assertThatThrownBy(() -> cart.applyVoucher("XYZ"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("XYZ");
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 5})
    void quantities(int q) {
        cart.add("p", BigDecimal.ONE, q);
        assertThat(cart.quantityOf("p")).isEqualTo(q);
    }

    @ParameterizedTest(name = "{0} x {1}")
    @CsvSource({"10.00, 2, 20.00", "'99.99', 1, 99.99", " 50 , 3 , 150.00"})
    void totals(BigDecimal price, int qty, String expected) {
        cart.add("p", price, qty);
        assertThat(cart.total()).isEqualByComparingTo(new BigDecimal(expected));
    }

    static Stream<Arguments> vouchers() {
        return Stream.of(arguments("5", "0.00"), Arguments.of("100", "80.00"));
    }

    @ParameterizedTest
    @MethodSource("vouchers")
    void voucherNeverNegative(String price, String expected) {
        cart.add("p", new BigDecimal(price), 1);
        cart.applyVoucher("QA2024");
        assertThat(cart.total()).isEqualByComparingTo(expected == null ? null : new BigDecimal(expected));
    }

    @Test
    void assertjCollections() {
        List<String> names = List.of("a", "b", "c");
        assertThat(names).hasSize(3).contains("b").containsExactly("a", "b", "c").doesNotContain("z");
        assertThat("Koszyk").startsWith("Ko").contains("sz");
        assertThat(true).isTrue();
        assertAll(() -> assertTrue(true), () -> assertFalse(false));
    }

    @Test
    @Disabled("do zrobienia")
    void disabled() { fail("nie powinno się uruchomić"); }

    @Test
    void crashes() {
        String s = null;
        s.length();
    }

    private void assertTotal(String expected) {
        assertThat(cart.total()).isEqualByComparingTo(new BigDecimal(expected));
    }

    @Test
    void helperMethod() {
        cart.add("a", BigDecimal.TEN, 1);
        assertTotal("10");
    }
}
`;

describe('buildJavaProgram', () => {
  it('składa pliki w jeden Main.java i zbiera klasy', () => {
    const program = buildJavaProgram([cart, { path: 'CartTest.java', content: candidateTests }]);
    expect(program.classNames).toEqual(['Cart', 'CartTest']);
    expect(program.source).toContain('public class Main');
    expect(program.source).not.toMatch(/^package /m);
    expect(program.source).not.toContain('org.junit');
    expect(program.source).toContain('Assertions.assertThat(cart.total())');
    expect(program.source).toContain('Arguments.arguments("5"');
    // własna metoda pomocnicza nie jest przepisywana
    expect(program.source).toContain('private void assertTotal(String expected)');
  });

  it('nie przepisuje wywołań w stringach i komentarzach', () => {
    const program = buildJavaProgram([
      {
        path: 'T.java',
        content: 'import static org.junit.jupiter.api.Assertions.*;\nclass T { // assertEquals(1,1)\n String s = "assertTrue(x)"; }\n',
      },
    ]);
    expect(program.source).toContain('// assertEquals(1,1)');
    expect(program.source).toContain('"assertTrue(x)"');
  });

  it('odrzuca zarezerwowane nazwy klas', () => {
    expect(() => buildJavaProgram([{ path: 'Main.java', content: 'public class Main {}' }])).toThrow(JavaBuildError);
  });

  it('mapuje numery linii na oryginalne pliki', () => {
    const program = buildJavaProgram([cart, { path: 'CartTest.java', content: candidateTests }]);
    const idx = program.lineMap.findIndex((o) => o?.file === 'CartTest.java' && o.line === 30);
    expect(remapJavaOutput(`at CartTest.x(Main.java:${idx + 1})`, program.lineMap)).toBe('at CartTest.x(CartTest.java:30)');
  });
});

describe.skipIf(!hasJavac)('JUnit-lite (prawdziwy javac)', () => {
  it('kompiluje i uruchamia testy kandydata', () => {
    const program = buildJavaProgram([cart, { path: 'CartTest.java', content: candidateTests }]);
    const out = compileAndRun(program.source);
    expect(out.compileOutput).toBe('');
    const parsed = parseJavaStdout(out.stdout, program.lineMap);
    expect(parsed.done).toBe(true);
    const byName = Object.fromEntries(parsed.tests.map((t) => [t.name, t]));

    expect(byName['Pusty koszyk = 0'].status).toBe('passed');
    expect(byName['zeroQuantityIsRejected()'].status).toBe('failed');
    expect(byName['thresholdDiscount()'].status).toBe('failed');
    expect(byName['thresholdDiscount()'].message).toContain('CartTest.java:');
    expect(byName['mergesSameProduct()'].status).toBe('passed');
    expect(byName['unknownVoucher()'].status).toBe('passed');
    expect(byName['assertjCollections()'].status).toBe('passed');
    expect(byName['disabled()'].status).toBe('skipped');
    expect(byName['crashes()'].status).toBe('error');
    expect(byName['crashes()'].message).toContain('NullPointerException');
    expect(byName['helperMethod()'].status).toBe('passed');
    expect(parsed.tests.filter((t) => t.name.startsWith('quantities')).map((t) => t.status)).toEqual(['passed', 'passed', 'passed']);
    const totals = parsed.tests.filter((t) => / x /.test(t.name));
    expect(totals.map((t) => t.status)).toEqual(['passed', 'passed', 'passed']);
    expect(totals[0].name).toBe('[1] 10.00 x 2');
    expect(parsed.tests.filter((t) => t.name.startsWith('voucherNeverNegative')).map((t) => t.status)).toEqual(['passed', 'passed']);
    expect(parsed.tests.every((t) => t.suite === 'Koszyk')).toBe(true);
    expect(parsed.console.map((c) => c.text)).toContain('log z testu: 30.00');
  });

  it('przykładowe zadanie kompiluje się bez zmian', () => {
    const program = buildJavaProgram(example.files);
    const out = compileAndRun(program.source);
    expect(out.compileOutput).toBe('');
    const parsed = parseJavaStdout(out.stdout, program.lineMap);
    expect(parsed.tests).toHaveLength(1);
    expect(parsed.tests[0].status).toBe('passed');
  });

  it('błędy kompilacji wskazują oryginalny plik i linię', () => {
    const program = buildJavaProgram([
      cart,
      { path: 'CartTest.java', content: 'import org.junit.jupiter.api.Test;\nclass CartTest {\n  @Test void x() {\n    int a = "tekst";\n  }\n}\n' },
    ]);
    const out = compileAndRun(program.source);
    expect(out.compiled).toBe(false);
    const diags = parseJavacErrors(out.compileOutput, program.lineMap);
    expect(diags[0]).toMatchObject({ file: 'CartTest.java', line: 4 });
  });

  it('tryb programu: uruchamia main, gdy nie ma testów', () => {
    const program = buildJavaProgram([
      { path: 'App.java', content: 'public class App { public static void main(String[] a) { System.out.println("Cześć"); } }' },
    ]);
    const out = compileAndRun(program.source);
    const parsed = parseJavaStdout(out.stdout, program.lineMap);
    expect(parsed.mode).toBe('program');
    expect(parsed.console.map((c) => c.text)).toEqual(['Cześć']);
  });
});

it('javac dostępny w środowisku CI (informacyjnie)', () => {
  if (hasJavac) execFileSync('javac', ['-version']);
  expect(true).toBe(true);
});

describe.skipIf(!hasJavac)('Logger-lite', () => {
  it('obsługuje SLF4J i Log4j z placeholderami i wyjątkiem', () => {
    const program = buildJavaProgram([
      {
        path: 'Service.java',
        content: `import org.slf4j.Logger;\nimport org.slf4j.LoggerFactory;\npublic class Service {\n  private static final Logger log = LoggerFactory.getLogger(Service.class);\n  int run(int x) { log.info("liczę dla {} i {}", x, "y"); log.error("błąd", new RuntimeException("boom")); return x * 2; }\n}\n`,
      },
      {
        path: 'ServiceTest.java',
        content: `import org.apache.logging.log4j.LogManager;\nimport org.apache.logging.log4j.Logger;\nimport org.junit.jupiter.api.Test;\nimport static org.junit.jupiter.api.Assertions.assertEquals;\nclass ServiceTest {\n  private static final Logger LOG = LogManager.getLogger(ServiceTest.class);\n  @Test void doubles() { LOG.debug("start"); assertEquals(4, new Service().run(2)); }\n}\n`,
      },
    ]);
    const out = compileAndRun(program.source);
    expect(out.compileOutput).toBe('');
    const parsed = parseJavaStdout(out.stdout, program.lineMap);
    expect(parsed.tests[0].status).toBe('passed');
    const text = parsed.console.map((c) => c.text).join('\n');
    expect(text).toMatch(/DEBUG ServiceTest - start/);
    expect(text).toMatch(/INFO  Service - liczę dla 2 i y/);
    expect(text).toMatch(/java.lang.RuntimeException: boom/);
  });

  it('testy działają w wątku „Test worker” (jak w Gradle), więc log ma wzorzec logback', () => {
    const program = buildJavaProgram([
      {
        path: 'ThreadNameTest.java',
        content: `import org.junit.jupiter.api.Test;\nimport org.slf4j.Logger;\nimport org.slf4j.LoggerFactory;\nclass ThreadNameTest {\n  private static final Logger logger = LoggerFactory.getLogger(ThreadNameTest.class);\n  @Test void logs() { logger.info("msg {}", 1); logger.error("err"); }\n}\n`,
      },
    ]);
    const out = compileAndRun(program.source);
    expect(out.compileOutput).toBe('');
    const lines = parseJavaStdout(out.stdout, program.lineMap).console.map((c) => c.text);
    expect(lines[0]).toMatch(/^\d\d:\d\d:\d\d\.\d{3} \[Test worker\] INFO  ThreadNameTest - msg 1$/);
    expect(lines[1]).toMatch(/^\d\d:\d\d:\d\d\.\d{3} \[Test worker\] ERROR ThreadNameTest - err$/);
  });

  it('tryb programu (main) zachowuje nazwę wątku „main”', () => {
    const program = buildJavaProgram([
      { path: 'App.java', content: 'public class App { public static void main(String[] a) { System.out.println(Thread.currentThread().getName()); } }' },
    ]);
    const out = compileAndRun(program.source);
    expect(parseJavaStdout(out.stdout, program.lineMap).console.map((c) => c.text)).toEqual(['main']);
  });
});

describe.skipIf(!hasJavac)('przykład z build.gradle i loggerem', () => {
  it('kompiluje się, startowe testy przechodzą, logi trafiają na konsolę', () => {
    const t = parseTask(readFileSync('examples/java-koszt-dostawy-parametryzowane.md', 'utf8'));
    const program = buildJavaProgram(t.files);
    const out = compileAndRun(program.source);
    expect(out.compileOutput).toBe('');
    const parsed = parseJavaStdout(out.stdout, program.lineMap);
    expect(parsed.tests.map((x) => x.status)).toEqual(['passed', 'passed']);
    expect(parsed.console.some((c) => /INFO  ShippingCalculatorTest - Przypadek: PL \/ 0.5/.test(c.text))).toBe(true);
  });
});
