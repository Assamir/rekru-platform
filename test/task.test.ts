import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseTask, TaskParseError, isTestFile } from '../src/lib/task';
import { decodeTask, encodeTask } from '../src/lib/share';

describe('parseTask', () => {
  it('czyta frontmatter, opis i pliki', () => {
    const t = parseTask(readFileSync('examples/java-koszyk-testy.md', 'utf8'));
    expect(t.title).toBe('Koszyk zakupowy – napisz testy jednostkowe');
    expect(t.language).toBe('java');
    expect(t.durationMin).toBe(45);
    expect(t.files.map((f) => [f.path, f.readonly])).toEqual([
      ['Cart.java', true],
      ['CartTest.java', false],
    ]);
    expect(t.description).toContain('## Wymagania');
    expect(t.description).not.toContain('class Cart');
  });

  it('wszystkie przykłady są poprawne', () => {
    for (const f of readdirSync('examples')) {
      expect(() => parseTask(readFileSync(`examples/${f}`, 'utf8'), f), f).not.toThrow();
    }
  });

  it('zostawia w opisie bloki kodu bez file=', () => {
    const t = parseTask('---\nlanguage: ts\n---\nOpis\n```ts\nconst przyklad = 1;\n```\n```ts file=a.ts\nexport {}\n```\n');
    expect(t.language).toBe('typescript');
    expect(t.description).toContain('const przyklad = 1;');
    expect(t.files).toHaveLength(1);
  });

  it('obsługuje dłuższe płotki i flagę hidden', () => {
    const t = parseTask('# Tytuł\n````ts file=x.test.ts hidden\n```\nnested\n```\n````\n```ts file=x.ts\nexport const a = 1;\n```');
    expect(t.title).toBe('Tytuł');
    expect(t.files[0]).toMatchObject({ path: 'x.test.ts', hidden: true });
    expect(t.files[0].content).toContain('nested');
    expect(isTestFile(t, t.files[0])).toBe(true);
    expect(isTestFile(t, t.files[1])).toBe(false);
  });

  it('zgłasza czytelne błędy', () => {
    expect(() => parseTask('# brak plików\n')).toThrow(TaskParseError);
    expect(() => parseTask('---\nlanguage: java\n---\n```ts file=a.ts\n```')).toThrow(/nie pasuje/);
    expect(() => parseTask('---\nlanguage: cobol\n---\n```txt file=a.txt\n```')).toThrow(/języka/);
  });
});

describe('link z zadaniem', () => {
  it('koduje i dekoduje treść (także polskie znaki)', async () => {
    const md = readFileSync('examples/typescript-walidator-hasel.md', 'utf8');
    const enc = await encodeTask(md);
    expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(enc.length).toBeLessThan(md.length);
    expect(await decodeTask(enc)).toBe(md);
  });
});

describe('serializeTask', () => {
  it('zapis i ponowny odczyt daje to samo zadanie', async () => {
    const { serializeTask } = await import('../src/lib/task');
    for (const f of readdirSync('examples')) {
      const t = parseTask(readFileSync(`examples/${f}`, 'utf8'), f);
      const again = parseTask(serializeTask(t, t.files));
      expect(again.files).toEqual(t.files);
      expect(again.title).toBe(t.title);
      expect(again.description).toBe(t.description);
    }
  });
});
