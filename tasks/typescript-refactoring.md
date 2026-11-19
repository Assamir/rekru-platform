---
title: Test refactoring
language: typescript
---

# Test refactoring

Task: Improve test code quality (take into consideration maintainability and simplicity).

Conditions:

- Do not change the Calculator class
- You can change anything inside this class
- The output produced by this test must match EXPECTED RESULTS
- You can run this code anytime to check and compare results

EXPECTED RESULTS

```text
08:03:02.386 [Test worker] INFO  MyFirstTest - logicTest multiple 0
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 12
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 24
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 36
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest add 16
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 60
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 72
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest add 19
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 96
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 108
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 120
08:03:02.395 [Test worker] INFO  MyFirstTest - logicTest multiple 132
08:03:02.395 [Test worker] INFO  MyFirstTest - It is working!
08:03:02.397 [Test worker] ERROR MyFirstTest - Different values of currency
```

```typescript file=Calculator.ts readonly
// Calculator helper class implemented in TypeScript, equivalent to the Java version
export class Calculator {
    add(a: number, b: number): number {
        return a + b;
    }

    subtract(a: number, b: number): number {
        return a - b;
    }

    multiple(a: number, b: number): number {
        return a * b;
    }

    divide(a: number, b: number): number {
        return Math.floor(a / b);
    }

    currencyExchangeEURToPLN(value: number | null): string {
        if (value == null) return "0 PLN";
        // Java uses BigDecimal with 2 decimal places, but output is formatted as %f PLN (which is float, but let's use 2 decimals)
        return `${(value * 4.45).toFixed(2)} PLN`;
    }
}
```

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

```typescript file=MyFirstTest.test.ts
import { describe, test } from 'vitest';
import { Calculator } from './Calculator';
import { getLogger } from './logger';

/*
Task: Improve test code quality (take into consideration maintainability and simplicity).
Conditions:
• Do not change the Calculator class
• You can change anything inside this class
• The output produced by this test must match EXPECTED RESULTS
• You can run this code anytime to check and compare results

EXPECTED RESULTS
08:03:02.386 [Test worker] INFO  MyFirstTest - logicTest multiple 0
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 12
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 24
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 36
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest add 16
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 60
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 72
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest add 19
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 96
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 108
08:03:02.394 [Test worker] INFO  MyFirstTest - logicTest multiple 120
08:03:02.395 [Test worker] INFO  MyFirstTest - logicTest multiple 132
08:03:02.395 [Test worker] INFO  MyFirstTest - It is working!
08:03:02.397 [Test worker] ERROR MyFirstTest - Different values of currency
*/
const logger = getLogger('MyFirstTest');

describe('MyFirstTest', () => {
    test('logicTest', () => {
        let success: boolean | null = null;

        for (let i = 0; i < "Hello world!".length; i++) {
            success = false;
            let myIndex = i;
            let myStringLen = "Hello world!".length;
            let chars = "Hello world!".split("");
            let aChar = chars[myIndex];
            if (aChar === 'o') {
                let calculator = new Calculator();
                let result = calculator.add(myIndex, myStringLen);
                logger.info(`logicTest add ${result}`);
                let res = false;
                if (result > 17) {
                    res = true;
                } else {
                    res = false;
                }
                success = res;
            }
            if (aChar !== 'o') {
                let calculator = new Calculator();
                let result = calculator.multiple(myIndex, myStringLen);
                logger.info(`logicTest multiple ${result}`);
                let res = false;
                if (result > 30) {
                    res = true;
                } else {
                    res = false;
                }
                success = res;
            }
        }
        if (success === null) {
            logger.info("Wrong data");
        }
        if (success === true) {
            logger.info("It is working!");
        }
        if (success === false) {
            logger.error("We have errors :(");
        }
        let exchangeCalculator = new Calculator();
        let exchangeEURToPLN = exchangeCalculator.currencyExchangeEURToPLN(20);
        if (exchangeEURToPLN !== "21 PLN") {
            logger.error("Different values of currency");
        }
    });
});
```
