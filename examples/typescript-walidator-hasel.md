---
title: Walidator haseł – implementacja pod testy
language: typescript
duration: 30
level: junior / mid
author: Zespół QA
---

# Walidator haseł – implementacja pod testy

Testy w pliku `src/passwordValidator.test.ts` (tylko do odczytu) opisują oczekiwane zachowanie
funkcji `validatePassword`. Uzupełnij implementację w `src/passwordValidator.ts` tak, żeby
**wszystkie testy przechodziły**.

## Reguły

Funkcja zwraca obiekt `{ valid: boolean; errors: string[] }`. Hasło jest poprawne, gdy:

| Kod błędu       | Reguła                                   |
|-----------------|------------------------------------------|
| `TOO_SHORT`     | ma co najmniej 8 znaków                  |
| `NO_UPPERCASE`  | zawiera co najmniej jedną wielką literę  |
| `NO_DIGIT`      | zawiera co najmniej jedną cyfrę          |
| `NO_SPECIAL`    | zawiera znak specjalny spośród `!@#$%^&*` |
| `HAS_WHITESPACE`| nie zawiera białych znaków               |

Błędy zwracane są w kolejności z tabeli.

## Dodatkowe pytania do rozmowy

- Jakich przypadków brzegowych brakuje w testach?
- Które testy przepisałbyś na testy parametryzowane (`test.each`)?

```typescript file=src/passwordValidator.ts
export type PasswordError =
  | 'TOO_SHORT'
  | 'NO_UPPERCASE'
  | 'NO_DIGIT'
  | 'NO_SPECIAL'
  | 'HAS_WHITESPACE';

export interface ValidationResult {
  valid: boolean;
  errors: PasswordError[];
}

export function validatePassword(password: string): ValidationResult {
  const errors: PasswordError[] = [];

  // TODO: zaimplementuj reguły

  return { valid: errors.length === 0, errors };
}
```

```typescript file=src/passwordValidator.test.ts readonly
import { describe, expect, it, test } from 'vitest';
import { validatePassword } from './passwordValidator';

describe('validatePassword', () => {
  it('akceptuje poprawne hasło', () => {
    expect(validatePassword('Sup3r!Haslo')).toEqual({ valid: true, errors: [] });
  });

  it('odrzuca zbyt krótkie hasło', () => {
    const result = validatePassword('Ab1!');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('TOO_SHORT');
  });

  test.each([
    ['bez wielkiej litery', 'haslo123!', 'NO_UPPERCASE'],
    ['bez cyfry', 'HasloBezCyfr!', 'NO_DIGIT'],
    ['bez znaku specjalnego', 'Haslo1234', 'NO_SPECIAL'],
    ['ze spacją', 'Has lo123!', 'HAS_WHITESPACE'],
  ])('hasło %s zwraca błąd', (_label, password, expected) => {
    expect(validatePassword(password).errors).toEqual([expected]);
  });

  it('zwraca wszystkie błędy w ustalonej kolejności', () => {
    expect(validatePassword(' ').errors).toEqual([
      'TOO_SHORT',
      'NO_UPPERCASE',
      'NO_DIGIT',
      'NO_SPECIAL',
      'HAS_WHITESPACE',
    ]);
  });
});
```
