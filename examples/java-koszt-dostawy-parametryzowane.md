---
title: Koszt dostawy – testy parametryzowane
language: java
duration: 40
level: mid / senior
author: Zespół QA
---

# Koszt dostawy – testy parametryzowane

Klasa `ShippingCalculator` liczy koszt dostawy paczki i loguje swoje decyzje (SLF4J).
Napisz w `ShippingCalculatorTest.java` **testy parametryzowane** (`@ParameterizedTest` z
`@CsvSource` lub `@MethodSource`), które pokryją tabelę decyzyjną poniżej, łącznie z
wartościami brzegowymi. **W implementacji ukryte są dwa błędy** – znajdź je testami.

## Tabela decyzyjna

| Kraj        | Waga paczki       | Koszt                     |
|-------------|-------------------|---------------------------|
| `PL`        | do 1 kg włącznie  | 12,99 zł                  |
| `PL`        | powyżej 1 do 10 kg| 18,99 zł                  |
| `PL`        | powyżej 10 kg     | 18,99 zł + 2 zł za każdy rozpoczęty kg ponad 10 |
| `DE`, `CZ`  | dowolna           | koszt jak dla `PL` × 2    |
| inny kraj   | –                 | `UnsupportedCountryException` |
| dowolny     | waga ≤ 0          | `IllegalArgumentException` |

Zamówienia z flagą `premium` mają darmową dostawę w Polsce.

## Do omówienia

- Które przypadki są wartościami brzegowymi i dlaczego?
- Czy logi pomagają w diagnozie, gdy test nie przechodzi?
- Jak zorganizowałbyś te testy w większym projekcie (Gradle, CI, raporty)?

```groovy file=build.gradle readonly
plugins {
    id 'java'
}

repositories {
    mavenCentral()
}

dependencies {
    implementation 'org.slf4j:slf4j-api:2.0.13'
    runtimeOnly 'ch.qos.logback:logback-classic:1.5.6'

    testImplementation platform('org.junit:junit-bom:5.10.2')
    testImplementation 'org.junit.jupiter:junit-jupiter'
    testImplementation 'org.junit.jupiter:junit-jupiter-params'
    testImplementation 'org.assertj:assertj-core:3.25.3'
}

test {
    useJUnitPlatform()
}
```

```java file=ShippingCalculator.java readonly
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Set;

public class ShippingCalculator {
    private static final Logger log = LoggerFactory.getLogger(ShippingCalculator.class);
    private static final Set<String> FOREIGN = Set.of("DE", "CZ");

    public BigDecimal cost(String country, double weightKg, boolean premium) {
        log.debug("Liczę koszt: kraj={}, waga={}, premium={}", country, weightKg, premium);
        if (weightKg <= 0) {
            throw new IllegalArgumentException("Weight must be positive: " + weightKg);
        }
        if (!"PL".equals(country) && !FOREIGN.contains(country)) {
            log.warn("Nieobsługiwany kraj: {}", country);
            throw new UnsupportedCountryException(country);
        }
        if (premium) {
            log.info("Darmowa dostawa premium");
            return BigDecimal.ZERO.setScale(2);
        }
        BigDecimal base;
        if (weightKg < 1) {
            base = new BigDecimal("12.99");
        } else if (weightKg < 10) {
            base = new BigDecimal("18.99");
        } else {
            int extraKg = (int) Math.ceil(weightKg - 10);
            base = new BigDecimal("18.99").add(BigDecimal.valueOf(2L * extraKg));
        }
        BigDecimal result = FOREIGN.contains(country) ? base.multiply(BigDecimal.valueOf(2)) : base;
        log.info("Koszt dostawy do {}: {}", country, result);
        return result.setScale(2, RoundingMode.HALF_UP);
    }
}
```

```java file=UnsupportedCountryException.java readonly
public class UnsupportedCountryException extends RuntimeException {
    public UnsupportedCountryException(String country) {
        super("Unsupported country: " + country);
    }
}
```

```java file=ShippingCalculatorTest.java
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ShippingCalculatorTest {
    private static final Logger log = LoggerFactory.getLogger(ShippingCalculatorTest.class);
    private final ShippingCalculator calculator = new ShippingCalculator();

    @ParameterizedTest(name = "{0}, {1} kg → {2} zł")
    @CsvSource({
        "PL, 0.5, 12.99",
    })
    void calculatesCost(String country, double weight, String expected) {
        log.info("Przypadek: {} / {}", country, weight);
        assertThat(calculator.cost(country, weight, false)).isEqualByComparingTo(new BigDecimal(expected));
    }

    @Test
    void rejectsUnknownCountry() {
        assertThatThrownBy(() -> calculator.cost("US", 1, false))
            .isInstanceOf(UnsupportedCountryException.class);
    }

    // TODO: wartości brzegowe, kraje zagraniczne, premium, waga ≤ 0
}
```
