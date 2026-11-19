---
title: Anagram
language: typescript
---

# Anagram

Please write method which for two strings will return true if they are anagrams and false otherwise.

Examples of anagrams:

- "restful" = "fluster" = "frustle"
- "cheater" = "teacher"

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

```typescript file=AnagramTest.test.ts
import { describe, expect, test } from 'vitest';
import { getLogger } from './logger';

// Note: This mirrors the Java class-based structure as closely as possible.

class AnagramTest {
    private static logger = getLogger('AnagramTest');

    static testData(): Array<[string, string, boolean]> {
        return [
            ["restful", "fluster", true], // Should return true
            ["cheater", "teacher", true], // Should return true
            ["hello", "world", false], // Should return false
        ];
    }

    // Simulate JUnit's @ParameterizedTest with a loop
    static checkAnagram(wordOne: string, wordTwo: string, isAnagram: boolean) {
        const areAnagrams = AnagramTest.Anagram.areAnagrams(wordOne, wordTwo);
        AnagramTest.logger.info(`Words: ${wordOne} | ${wordTwo}`);
        expect(areAnagrams).toBe(isAnagram);
    }

    // Inner class for anagram logic (to be implemented by candidate)
    static Anagram = class {
        /*
        Please write method which for two strings will return true if they are anagrams and false otherwise.
        Examples of anagrams:
        "restful" = "fluster" = "frustle"
        "cheater" = "teacher"
        */
        static areAnagrams(wordOne: string, wordTwo: string): boolean {
            // TODO: Implement this method
            return false;
        }
    }
}

describe('AnagramTest', () => {
    AnagramTest.testData().forEach(([wordOne, wordTwo, isAnagram]) => {
        test(`checkAnagram(${wordOne}, ${wordTwo}) should be ${isAnagram}`, () => {
            AnagramTest.checkAnagram(wordOne, wordTwo, isAnagram);
        });
    });
});
```
