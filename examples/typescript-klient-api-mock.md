---
title: Klient REST – testy z mockowaniem
language: typescript
duration: 40
level: mid / senior
author: Zespół QA
---

# Klient REST – testy z mockowaniem

Klasa `UserClient` (plik `src/userClient.ts`, tylko do odczytu) pobiera użytkowników z API.
Zamiast prawdziwego `fetch` przyjmuje w konstruktorze funkcję `http`, dzięki czemu można ją
zamockować.

Napisz testy w `src/userClient.test.ts`, które sprawdzą:

1. poprawny adres URL i nagłówek `Authorization` przy `getUser(id)`,
2. mapowanie odpowiedzi API (`first_name`, `last_name`) na `fullName`,
3. zachowanie przy statusie **404** (zwraca `null`),
4. zachowanie przy statusie **500** (rzuca błąd `ApiError` ze statusem),
5. ponowienie próby (retry) – przy błędzie sieci klient próbuje **maksymalnie 3 razy**.

Do mockowania użyj `vi.fn()` (lub `jest.fn()`): `mockResolvedValue`, `mockRejectedValueOnce`,
`toHaveBeenCalledWith`, `toHaveBeenCalledTimes`…

```json file=package.json readonly
{
  "name": "user-client",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

```typescript file=src/userClient.ts readonly
export interface HttpResponse {
  status: number;
  json(): Promise<unknown>;
}

export type Http = (url: string, init: { headers: Record<string, string> }) => Promise<HttpResponse>;

export interface User {
  id: number;
  fullName: string;
  email: string;
}

export class ApiError extends Error {
  constructor(public readonly status: number) {
    super(`API responded with status ${status}`);
    this.name = 'ApiError';
  }
}

interface ApiUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export class UserClient {
  constructor(
    private readonly http: Http,
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly maxAttempts = 3,
  ) {}

  async getUser(id: number): Promise<User | null> {
    const response = await this.withRetry(() =>
      this.http(`${this.baseUrl}/users/${id}`, {
        headers: { Authorization: `Bearer ${this.token}` },
      }),
    );
    if (response.status === 404) return null;
    if (response.status >= 400) throw new ApiError(response.status);
    const body = (await response.json()) as ApiUser;
    return { id: body.id, fullName: `${body.first_name} ${body.last_name}`, email: body.email };
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError;
  }
}
```

```typescript file=src/userClient.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, UserClient, type Http } from './userClient';

const okResponse = (body: unknown) => ({ status: 200, json: async () => body });

describe('UserClient', () => {
  let http: ReturnType<typeof vi.fn<Http>>;
  let client: UserClient;

  beforeEach(() => {
    http = vi.fn<Http>();
    client = new UserClient(http, 'https://api.example.com', 'secret-token');
  });

  it('wysyła żądanie pod poprawny adres', async () => {
    http.mockResolvedValue(okResponse({ id: 7, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' }));

    await client.getUser(7);

    expect(http).toHaveBeenCalledWith('https://api.example.com/users/7', expect.anything());
  });

  // TODO: dopisz pozostałe przypadki
});
```
