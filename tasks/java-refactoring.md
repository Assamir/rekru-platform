---
title: Test refactoring
language: java
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

```java file=Calculator.java readonly
import java.math.BigDecimal;
import java.math.RoundingMode;

public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public int subtract(int a, int b) {
        return a - b;
    }

    public int multiple(int a, int b) {
        return a * b;
    }

    public int divide(int a, int b) {
        return a / b;
    }

    public String currencyExchangeEURToPLN(Integer value) {
        return value == null ? "0 PLN" : String.format("%f PLN", BigDecimal.valueOf(value * 4.45).setScale(2, RoundingMode.HALF_UP));
    }
}
```

```java file=MyFirstTest.java
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

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
class MyFirstTest {
    private static final Logger logger = LoggerFactory.getLogger(MyFirstTest.class);

    @Test
    void logicTest() {
        Boolean success = null;

        for (var i = 0; i < "Hello world!".length(); i++) {
            success = false;
            var myIndex = i;
            var myStringLen = "Hello world!".length();
            var chars = "Hello world!".toCharArray();
            var aChar = chars[myIndex];
            if (aChar == 'o') {
                var calculator = new Calculator();
                var result = calculator.add(myIndex, myStringLen);
                logger.info("logicTest add {}", result);
                var res = false;
                if (result > 17) {
                    res = true;
                } else {
                    res = false;
                }
                success = res;
            }
            if (aChar != 'o') {
                var calculator = new Calculator();
                var result = calculator.multiple(myIndex, myStringLen);
                logger.info("logicTest multiple {}", result);
                var res = false;
                if (result > 30) {
                    res = true;
                } else {
                    res = false;
                }
                success = res;
            }
        }
        if (success == null) {
            logger.info("Wrong data");

        }
        if (success == true) {
            logger.info("It is working!");
        }
        if (success == false) {
            logger.error("We have errors :(");
        }
        var exchangeCalculator = new Calculator();
        var exchangeEURToPLN = exchangeCalculator.currencyExchangeEURToPLN(20);
        if(exchangeEURToPLN != "21 PLN"){
            logger.error("Different values of currency");
        }
    }
}
```
