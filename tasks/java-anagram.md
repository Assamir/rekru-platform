---
title: Anagram
language: java
---

# Anagram

Please write method which for two strings will return true if they are anagrams and false otherwise.

Examples of anagrams:

- "restful" = "fluster" = "frustle"
- "cheater" = "teacher"

```java file=AnagramTest.java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AnagramTest {
    private static final Logger logger = LoggerFactory.getLogger(AnagramTest.class);

    private static Stream<Arguments> testData() {
        return Stream.of(
                Arguments.of("restful", "fluster", true), // Should return true
                Arguments.of("cheater", "teacher", true), // Should return true
                Arguments.of("hello", "world", false) // Should return false
        );
    }

    @ParameterizedTest
    @MethodSource("testData")
    void checkAnagram(String wordOne, String wordTwo, boolean isAnagram) {
        var areAnagrams = Anagram.areAnagrams(wordOne, wordTwo);
        logger.info("Words: {} | {}", wordOne, wordTwo);
        assertEquals(isAnagram, areAnagrams);
    }


    public static class Anagram {
        /*
        Please write method which for two strings will return true if they are anagrams and false otherwise.
        Examples of anagrams:
        "restful" = "fluster" = "frustle"
        "cheater" = "teacher"
        */
        public static boolean areAnagrams(String wordOne, String wordTwo) {
            return false;
        }
    }
}
```
