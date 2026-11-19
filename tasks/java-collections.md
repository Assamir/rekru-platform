---
title: Collections
language: java
---

# Collections

Please print out in alphabetical order Names with grades where grades are greater or equal 3 and lower or equal to 8

```java file=MyCollectionTest.java
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

class MyCollectionTest {
    private static final Logger logger = LoggerFactory.getLogger(MyCollectionTest.class);

    private static final Map<String, Integer> grades = Map.of(
            "John", 8,
            "Eve", 9,
            "Hendry", 1,
            "Elizabeth", 7,
            "Zoltan", 4,
            "Olga", 7,
            "Konrad", 3,
            "Beata", 1,
            "Mark", 5,
            "Christin", 6
    );

    /*
    Please print out in alphabetical order Names with grades where grades are  greater or equal 3 and lower or equal to 8
     */
    @Test
    void filterGradesTest() {

    }
}
```
