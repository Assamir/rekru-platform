---
title: Collections
language: typescript
---

# Collections

Please print out in alphabetical order Names with grades where grades are greater or equal 3 and lower or equal to 8

```typescript file=logger.ts readonly
// Minimal SLF4J / Logback look-alike - DO NOT MODIFY.
// Prints lines in the pattern: HH:mm:ss.SSS [Test worker] LEVEL loggerName - message

export interface Logger {
    readonly name: string;
    trace(message: string, ...args: unknown[]): void;
    debug(message: string, ...args: unknown[]): void;
    info(message: string, ...args: unknown[]): void;
    warn(message: string, ...args: unknown[]): void;
    error(message: string, ...args: unknown[]): void;
}

function pad(value: number, length: number): string {
    return String(value).padStart(length, '0');
}

function timestamp(date: Date): string {
    return `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}:${pad(date.getSeconds(), 2)}.${pad(date.getMilliseconds(), 3)}`;
}

function formatArg(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value) ?? String(value);
}

export function getLogger(name: string): Logger {
    const write = (level: string, message: string, args: unknown[]): void => {
        let used = 0;
        // Like SLF4J: every {} is replaced by the next argument.
        const text = message.replace(/\{\}/g, (match) => (used < args.length ? formatArg(args[used++]) : match));
        console.log(`${timestamp(new Date())} [Test worker] ${level.padEnd(5)} ${name} - ${text}`);
    };
    return {
        name,
        trace: (message, ...args) => write('TRACE', message, args),
        debug: (message, ...args) => write('DEBUG', message, args),
        info: (message, ...args) => write('INFO', message, args),
        warn: (message, ...args) => write('WARN', message, args),
        error: (message, ...args) => write('ERROR', message, args),
    };
}
```

```typescript file=CollectionTest.test.ts
import { describe, test } from 'vitest';
import { getLogger } from './logger';

const logger = getLogger('CollectionTest');

describe('CollectionTest', () => {
    // Map of grades
    const grades = new Map<string, number>([
        ["John", 8],
        ["Eve", 9],
        ["Hendry", 1],
        ["Elizabeth", 7],
        ["Zoltan", 4],
        ["Olga", 7],
        ["Konrad", 3],
        ["Beata", 1],
        ["Mark", 5],
        ["Christin", 6],
    ]);

    /*
    Please print out in alphabetical order Names with grades where grades are  greater or equal 3 and lower or equal to 8
    */
    test('filterGrades', () => {
        // TODO: Implement test logic
    });
});
```
