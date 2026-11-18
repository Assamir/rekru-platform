---
title: Koszyk zakupowy – napisz testy jednostkowe
language: java
duration: 45
level: mid
author: Zespół QA
---

# Koszyk zakupowy – napisz testy jednostkowe

Zespół deweloperski przekazał do testów klasę `Cart` (plik `Cart.java`, tylko do odczytu).
Twoim zadaniem jest napisanie testów jednostkowych w pliku `CartTest.java`, które sprawdzą
poniższe wymagania biznesowe. **W implementacji są co najmniej dwa błędy** – Twoje testy
powinny je wykryć (czyli w tych miejscach zakończyć się porażką).

## Wymagania

1. Do koszyka można dodać produkt o nazwie, cenie jednostkowej i ilości.
2. Ilość musi być większa od 0, a cena nie może być ujemna – w przeciwnym razie
   `IllegalArgumentException`.
3. Dodanie tego samego produktu ponownie **zwiększa ilość** zamiast tworzyć nową pozycję.
4. `total()` zwraca sumę `cena × ilość` dla wszystkich pozycji.
5. Jeśli wartość koszyka wynosi **co najmniej 200 zł**, naliczany jest rabat 10%.
6. Kod `QA2024` daje dodatkowe 20 zł zniżki (po rabacie procentowym). Wartość końcowa nigdy
   nie spada poniżej 0.
7. Nieznany kod rabatowy powoduje `IllegalArgumentException` z komunikatem zawierającym ten kod.

## Wskazówki

- Dostępne są adnotacje JUnit 5 (`@Test`, `@BeforeEach`, `@ParameterizedTest`, `@CsvSource`,
  `@ValueSource`, `@MethodSource`, `@DisplayName`…) oraz asercje JUnit (`assertEquals`, `assertThrows`…)
  i AssertJ (`assertThat(...)`).
- Uruchom testy przyciskiem **Uruchom testy** lub skrótem `Ctrl+Enter`.
- Na koniec opowiedz, jakie błędy znalazłeś i jak byś je zgłosił.

```java file=Cart.java readonly
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;

public class Cart {
    private static final BigDecimal DISCOUNT_THRESHOLD = new BigDecimal("200");
    private static final BigDecimal DISCOUNT_RATE = new BigDecimal("0.10");
    private static final BigDecimal VOUCHER_VALUE = new BigDecimal("20");

    private final Map<String, Line> lines = new LinkedHashMap<>();
    private String voucher;

    public void add(String name, BigDecimal unitPrice, int quantity) {
        if (quantity < 0) {
            throw new IllegalArgumentException("Quantity must be positive");
        }
        if (unitPrice.signum() < 0) {
            throw new IllegalArgumentException("Price cannot be negative");
        }
        Line existing = lines.get(name);
        if (existing != null) {
            existing.quantity += quantity;
        } else {
            lines.put(name, new Line(unitPrice, quantity));
        }
    }

    public int quantityOf(String name) {
        Line line = lines.get(name);
        return line == null ? 0 : line.quantity;
    }

    public int positions() {
        return lines.size();
    }

    public void applyVoucher(String code) {
        if (!"QA2024".equals(code)) {
            throw new IllegalArgumentException("Unknown voucher: " + code);
        }
        this.voucher = code;
    }

    public BigDecimal total() {
        BigDecimal sum = BigDecimal.ZERO;
        for (Line line : lines.values()) {
            sum = sum.add(line.unitPrice.multiply(BigDecimal.valueOf(line.quantity)));
        }
        if (sum.compareTo(DISCOUNT_THRESHOLD) > 0) {
            sum = sum.subtract(sum.multiply(DISCOUNT_RATE));
        }
        if (voucher != null) {
            sum = sum.subtract(VOUCHER_VALUE).max(BigDecimal.ZERO);
        }
        return sum.setScale(2, RoundingMode.HALF_UP);
    }

    private static class Line {
        final BigDecimal unitPrice;
        int quantity;

        Line(BigDecimal unitPrice, int quantity) {
            this.unitPrice = unitPrice;
            this.quantity = quantity;
        }
    }
}
```

```java file=CartTest.java
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;

class CartTest {

    private Cart cart;

    @BeforeEach
    void setUp() {
        cart = new Cart();
    }

    @Test
    @DisplayName("Pusty koszyk ma wartość 0")
    void emptyCartTotalIsZero() {
        assertEquals(new BigDecimal("0.00"), cart.total());
    }

    // TODO: dopisz kolejne testy
}
```
