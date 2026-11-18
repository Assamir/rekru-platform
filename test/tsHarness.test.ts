import { describe as d, expect as e, it as t } from 'vitest';
import { createHarness } from '../src/runners/ts/harness';
import { createModuleSystem } from '../src/runners/ts/moduleSystem';
import type { TestResult } from '../src/runners/types';

async function runSuite(define: (api: ReturnType<typeof createHarness>['api']) => void) {
  const results: TestResult[] = [];
  const h = createHarness({ onResult: (r) => results.push(r) });
  define(h.api);
  await h.run();
  return results;
}

d('mini harness', () => {
  t('raportuje passed/failed/error/skipped', async () => {
    const r = await runSuite(({ describe, it, expect }) => {
      describe('Kalkulator', () => {
        it('dodaje', () => expect(1 + 1).toBe(2));
        it('źle dodaje', () => expect(1 + 1).toBe(3));
        it('rzuca', () => {
          throw new TypeError('boom');
        });
        it.skip('pominięty', () => {});
        it.todo('do zrobienia');
      });
    });
    e(r.map((x) => [x.suite, x.name, x.status])).toEqual([
      ['Kalkulator', 'dodaje', 'passed'],
      ['Kalkulator', 'źle dodaje', 'failed'],
      ['Kalkulator', 'rzuca', 'error'],
      ['Kalkulator', 'pominięty', 'skipped'],
      ['Kalkulator', 'do zrobienia', 'skipped'],
    ]);
    e(r[1].message).toContain('Expected: 3');
    e(r[2].message).toContain('TypeError: boom');
  });

  t('hooki, each, async, only, timeout', async () => {
    const log: string[] = [];
    const r = await runSuite(({ describe, it, test, beforeEach, afterEach, beforeAll, expect }) => {
      beforeAll(() => log.push('beforeAll'));
      beforeEach(() => log.push('be-outer'));
      describe('A', () => {
        beforeEach(() => log.push('be-inner'));
        afterEach(() => log.push('ae-inner'));
        test.each([
          [1, 1, 2],
          [2, 3, 5],
        ])('%i + %i = %i', (a, b, c) => expect(a + b).toBe(c));
        test.each([{ x: 'a' }])('obj $x', ({ x }: { x: string }) => expect(x).toBe('a'));
        it('async', async () => {
          await new Promise((res) => setTimeout(res, 5));
          await expect(Promise.resolve(5)).resolves.toBe(5);
          await expect(Promise.reject(new Error('nie'))).rejects.toThrow('nie');
        });
        it('timeout', () => new Promise(() => {}), 50);
      });
    });
    e(r.map((x) => `${x.name}:${x.status}`)).toEqual(['1 + 1 = 2:passed', '2 + 3 = 5:passed', 'obj a:passed', 'async:passed', 'timeout:error']);
    e(r[4].message).toContain('limit czasu');
    e(log.slice(0, 4)).toEqual(['beforeAll', 'be-outer', 'be-inner', 'ae-inner']);

    const only = await runSuite(({ it }) => {
      it('a', () => {});
      it.only('b', () => {});
    });
    e(only.map((x) => x.status)).toEqual(['skipped', 'passed']);
  });

  t('matchery i mocki', async () => {
    const r = await runSuite(({ it, expect, vi }) => {
      it('equality', () => {
        expect({ a: 1, b: [1, 2], c: undefined }).toEqual({ a: 1, b: [1, 2] });
        expect({ a: 1, c: undefined }).not.toStrictEqual({ a: 1 });
        expect({ user: { id: 1, name: 'x' } }).toMatchObject({ user: { id: 1 } });
        expect([{ id: 1 }]).toContainEqual({ id: 1 });
        expect({ a: { b: 2 } }).toHaveProperty('a.b', 2);
        expect('Ala ma kota').toMatch(/kota$/);
        expect(0.1 + 0.2).toBeCloseTo(0.3);
        expect({ id: 5, at: new Date() }).toEqual({ id: expect.any(Number), at: expect.anything() });
        expect(['a', 'b', 'c']).toEqual(expect.arrayContaining(['c', 'a']));
        expect(() => JSON.parse('{')).toThrow(SyntaxError);
        expect(new Map([[1, { a: 1 }]])).toEqual(new Map([[1, { a: 1 }]]));
      });
      it('mocks', async () => {
        const f = vi.fn((x: number) => x * 2);
        f(2);
        f.mockReturnValueOnce(100);
        expect(f(3)).toBe(100);
        expect(f).toHaveBeenCalledTimes(2);
        expect(f).toHaveBeenCalledWith(3);
        expect(f).toHaveBeenNthCalledWith(1, 2);
        const g = vi.fn().mockResolvedValue({ ok: true });
        await expect(g()).resolves.toEqual({ ok: true });
        const obj = { hello: (n: string) => `hi ${n}` };
        const spy = vi.spyOn(obj, 'hello');
        expect(obj.hello('A')).toBe('hi A');
        expect(spy).toHaveBeenLastCalledWith('A');
        spy.mockRestore();
        expect(vi.isMockFunction(obj.hello)).toBe(false);
      });
      it('mock failure message', () => {
        const f = vi.fn();
        f('a');
        expect(f).toHaveBeenCalledWith('b');
      });
    });
    e(r[0].status, r[0].message).toBe('passed');
    e(r[1].status, r[1].message).toBe('passed');
    e(r[2].status).toBe('failed');
    e(r[2].message).toContain('1: "a"');
  });

  t('module system: importy względne i wbudowane', async () => {
    const results: TestResult[] = [];
    const h = createHarness({ onResult: (x) => results.push(x) });
    const sources = {
      'src/math.ts': 'exports.add = (a, b) => a + b;',
      'src/math.test.ts': 'const v = require("vitest"); const m = require("./math.js"); v.test("add", () => v.expect(m.add(2, 2)).toBe(4));',
    };
    const ms = createModuleSystem(sources, { vitest: h.api });
    ms.load('src/math.test.ts');
    await h.run();
    e(results).toMatchObject([{ name: 'add', status: 'passed' }]);
    e(() => createModuleSystem({ 'a.ts': 'require("lodash")' }, {}).load('a.ts')).toThrow(/package.json/);
  });
});
