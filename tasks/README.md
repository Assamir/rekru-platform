# Zadania rekrutacyjne

Indeks dla prowadzącego. Każdy plik `.md` w tym katalogu to jedno zadanie w formacie platformy
(opis + pliki z kodem). Zadania pochodzą z repozytorium JavaWorldTest i są tu jedynym wzorcem
(decyzja D-014 w [docs/planning/roadmap.md](../docs/planning/roadmap.md)).

Poziom zadania jest tylko w tym indeksie. Pliki zadań nie mają pola `level`, więc kandydat nie
widzi poziomu, na którym jest sprawdzany.

## Zadania

| Zadanie | Java | TypeScript | Poziomy | Stan początkowy |
|---|---|---|---|---|
| Refaktoryzacja | [java-refactoring.md](java-refactoring.md) | [typescript-refactoring.md](typescript-refactoring.md) | | Test przechodzi. Log zgadza się z blokiem `EXPECTED RESULTS` (poza czasem). Kandydat poprawia czytelność testu bez zmiany `Calculator`. |
| Anagram | [java-anagram.md](java-anagram.md) | [typescript-anagram.md](typescript-anagram.md) | | `areAnagrams` zwraca `false`, więc 2 z 3 przypadków celowo nie przechodzą. |
| Kolekcje | [java-collections.md](java-collections.md) | [typescript-collections.md](typescript-collections.md) | | Pusty test, który przechodzi. Kandydat wypisuje loggerem alfabetycznie imiona z ocenami z przedziału [3, 8]. |

Kolumnę „Poziomy” uzupełnia prowadzący.

## Przed rozmową

1. Sprawdź stan początkowy wszystkich zadań:

   ```powershell
   npm test
   ```

2. Sprawdź zadania Javy na prawdziwym Judge0 (wymaga internetu):

   ```powershell
   npm run test:judge0
   ```

3. Otwórz stronę główną platformy, wgraj plik zadania, skopiuj link i sprawdź, że się otwiera.

## Na rozmowie

- Wyślij kandydatowi link na czacie spotkania. Kandydat udostępnia ekran i uruchamia testy
  przyciskiem albo skrótem `Ctrl+Enter`.
- Jeśli kandydat woli własne IDE albo platforma lub kompilator Javy nie działa: przycisk
  **Pobierz projekt (IDE)** na ekranie zadania pobiera ZIP z projektem Gradle (Java) albo npm
  (TypeScript), razem z tym, co kandydat już napisał. Wymagania środowiska:
  [docs/planning/wymagania-kandydata.md](../docs/planning/wymagania-kandydata.md).

## Dodawanie zadania

1. Dodaj plik `<język>-<nazwa>.md` w obu językach. Opis i dane mają być takie same.
2. Nie dodawaj pól `level` ani `duration`.
3. W TypeScript dołącz plik `logger.ts` (tylko do odczytu) skopiowany z istniejącego zadania.
4. Dopisz oczekiwany stan początkowy do `test/tasks.test.ts` i wiersz do tabeli powyżej.
