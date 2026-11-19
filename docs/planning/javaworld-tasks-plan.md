# Zadania z JavaWorldTest na platformie: wynik sesji

Sesja planistyczna z 2026-11-19. Historia decyzji, backlog i otwarte pytania: [roadmap.md](roadmap.md).

## 1. Podsumowanie

**Problem.** Rozmowy techniczne z testerami automatyzującymi prowadzone były na jednoplikowych
paczkach dla kompilatorów online (TS Playground, JDoodle). JDoodle odpadł przez limit uruchomień,
więc Java nie miała platformy (otwarte D-001, D-010, D-013 i B-013 w roadmapie JavaWorldTest).

**Rozwiązanie.**

- rekru-platform zastępuje kompilatory online dla Javy i TypeScriptu.
- Trzy zadania z JavaWorldTest (refaktoryzacja, anagram, kolekcje) są w `tasks/` jako pliki `.md`,
  po jednym na język. Te pliki są odtąd jedynym wzorcem zadań.
- Platforma uruchamia Javę 17 zamiast 13, a log testów ma nazwę wątku `Test worker`, więc zgadza
  się z blokiem `EXPECTED RESULTS` co do znaku.
- Każde zadanie można pobrać jako projekt do IntelliJ / VS Code (Gradle dla Javy, npm i Vitest dla
  TypeScriptu). To plan B na rozmowie i równorzędna ścieżka dla kandydata, który woli własne IDE.

**Stan na koniec sesji** jest w sekcji 6.

## 2. Wymagania

| ID | Ustalenie |
|---|---|
| I-1 | Platforma zastępuje kompilatory online dla Javy i TS. |
| I-2 | Zakres: 3 zadania × 2 języki. |
| I-3 | Paczka do VS Code / IntelliJ dla każdego języka: plan B i równorzędna ścieżka. Pobierają ją prowadzący i kandydat. |
| I-4 | Kandydat dostaje wymagania środowiska przed rozmową. Kto ich nie spełnia, pracuje w przeglądarce. |
| SC-1 | Każde z 6 zadań startuje z tym samym wynikiem testów co w JavaWorldTest. |
| SC-2 | Log refaktoryzacji zgadza się z `EXPECTED RESULTS` (poza czasem), w Javie i w TS. |
| SC-3 | Paczka w IDE daje ten sam wynik testów i ten sam log co platforma, bez ręcznych poprawek. |

**Poza zakresem:** zamknięcie publicznego dostępu do zadań (osobna sesja, B-020), nowe zadania,
zadania z promptami, SQL.

**Termin:** rozmowa 2026-11-19 o 13:30. Całość, łącznie z paczką do IDE, miała być gotowa tego
samego dnia (ryzyko R-1).

## 3. Decyzje

Pełne uzasadnienia i odrzucone alternatywy są w [roadmap.md](roadmap.md).

| ID | Decyzja |
|---|---|
| D-014 | Wzorcem zadania jest plik `.md` w rekru-platform. Kod Javy z archiwum `src/`, treść i TS według `online/`. Paczki `online/` zamrożone. |
| D-015 | Java 17 (Judge0 id 91) na platformie i w paczce do IDE. |
| D-016 | Runner testów Javy nazywa wątek `Test worker`; w paczce `logback.xml` ma tę nazwę na stałe. |
| D-017 | Logger TS to plik zadania `logger.ts`, tylko do odczytu. |
| D-018 | Projekt do IDE to ZIP generowany w przeglądarce z bieżącego stanu plików. |
| D-019 | Paczka Java: Gradle z wrapperem, poziom języka 17. |
| D-020 | Paczka TS: Vitest. |
| D-021 | Opis po angielsku w panelu i w komentarzu kodu, `Calculator` tylko do odczytu, bez pola `level`. |
| D-022 | Bez licznika czasu. |
| D-023 | Zadania w `tasks/`, poza stroną główną. |
| D-024 | Weryfikacja automatyczna plus ręczna próba prowadzącego. |
| D-025 | Dystrybucja: plik → link → czat; paczka do IDE jako alternatywa; indeks w `tasks/README.md`. |
| D-026 | Roadmapa w rekru-platform, statusy „zastąpiona” w JavaWorldTest. |
| D-027 | Literówka `EXPCTED RESULTS` poprawiona. |
| D-028 | Wdrożenie na `main` po testach automatycznych, przed ręczną próbą. |

## 4. Kształt zadań

| Zadanie | Pliki Java | Pliki TypeScript |
|---|---|---|
| Refaktoryzacja | `Calculator.java` (tylko do odczytu), `MyFirstTest.java` | `Calculator.ts`, `logger.ts` (tylko do odczytu), `MyFirstTest.test.ts` |
| Anagram | `AnagramTest.java` (z klasą zagnieżdżoną `Anagram`) | `logger.ts` (tylko do odczytu), `AnagramTest.test.ts` |
| Kolekcje | `MyCollectionTest.java` | `logger.ts` (tylko do odczytu), `CollectionTest.test.ts` |

Różnice wobec JavaWorldTest:

- Java: usunięty `import org.example.helper.Calculator;`, bo na platformie i w paczce wszystkie
  klasy są w pakiecie domyślnym.
- TypeScript: testy importują `describe` / `test` / `expect` z `vitest`, a logger z `./logger`.
  `logger.ts` pisze wszystkie poziomy przez `console.log`, żeby kolejność linii była taka sama na
  platformie i w IDE.
- Poprawiona literówka w nagłówku `EXPECTED RESULTS` (D-027).

## 5. Przepływ na rozmowie

1. Prowadzący wgrywa plik z `tasks/` na stronie głównej platformy i kopiuje link.
2. Kandydat otwiera link, udostępnia ekran i uruchamia testy w przeglądarce.
3. Jeśli kandydat woli IDE albo platforma lub Judge0 nie działa, przycisk **Pobierz projekt (IDE)**
   pobiera ZIP z projektem zawierającym bieżący kod kandydata.

Wymagania środowiska dla wariantu z IDE: [wymagania-kandydata.md](wymagania-kandydata.md).

## 6. Weryfikacja

Stan z 2026-11-19, przed wdrożeniem na `main`. Wszystkie uruchomienia na komputerze prowadzącego
(Windows, JDK 25, Node 26).

| Co | Jak sprawdzone | Wynik |
|---|---|---|
| SC-1, SC-2 na runnerach platformy | `npm test` (`test/tasks.test.ts`): Java składana jak na platformie i uruchamiana lokalnym JDK z `--release 17`, TS kompilowany `tsc` z opcjami platformy i uruchamiany jej harnessem | przechodzi; cały zestaw: 56 testów przeszło, 11 pominiętych (testy na żądanie) |
| SC-1, SC-2 dla Javy na Judge0 | `npm run test:judge0`: trzy zadania wysłane na `ce.judge0.com`, Java 17 (id 91) | 3 z 3 przechodzą |
| SC-3: paczka do IDE | `npm run test:ide`: każde z 6 zadań spakowane do projektu, uruchomione przez `gradlew test` (Gradle 9.9.0) albo `npm install` + `npm test` (Vitest), wynik testów i log porównane z oczekiwaniami platformy | 36 testów przeszło (6 zadań + przykłady platformy) |
| Paczka Java na dwóch JDK | `gradlew test` na przykładzie platformy, JDK 21 i JDK 25 | `BUILD SUCCESSFUL` na obu |
| 6 zadań w przeglądarce | lokalny serwer (`npm run dev`), link do każdego zadania, przycisk „Uruchom testy”; Java przez `ce.judge0.com` | refaktoryzacja: 1 test przechodzi, 14 linii logu; anagram: 1 przechodzi, 2 nie; kolekcje: 1 przechodzi, brak logu — w obu językach |
| Typy i build | `npm run typecheck`, `npm run build` | bez błędów |

Stan początkowy potwierdzony we wszystkich środowiskach:

| Zadanie | Testy | Log |
|---|---|---|
| Refaktoryzacja | 1 przechodzi | 14 linii zgodnych z `EXPECTED RESULTS` (poza czasem) |
| Anagram | 2 z 3 nie przechodzą (celowo) | 3 linie `Words: … \| …` |
| Kolekcje | 1 przechodzi (pusty test) | brak |

**Nie sprawdzono:**

- otwarcia paczki w samym IntelliJ i VS Code (test uruchamia projekt z linii poleceń),
- `gradlew` na Linuksie i macOS (bit wykonywalności jest sprawdzany tylko w nagłówku ZIP),
- zadań i przycisku „Pobierz projekt (IDE)” na wdrożeniu Cloudflare — to ręczna próba prowadzącego (B-019),
- czy w panelu Cloudflare nie ma zmiennej `JAVA_LANGUAGE_ID=62`, która nadpisałaby nową wartość 91.

**Zmiany w platformie zrobione przy okazji:**

- zadanie bez pola `duration` nie pokazuje zegara (wcześniej stoper był widoczny zawsze), co
  realizuje D-022,
- linki do zadań mają 575–2444 znaków (dawne linki do TS Playground: 6,1–7,7 tys.), co dotyczy B-024.

## 7. Ryzyka i założenia

- **R-1 (zaakceptowane):** paczka do IDE powstała pod presją czasu, decyzje D-018–D-020 zapadły w
  trybie skróconym.
- **R-2 (zaakceptowane):** wdrożenie na `main` przed ręczną próbą prowadzącego (D-028).
- **A-1:** platforma zostaje na darmowych usługach. Publiczny Judge0 ma limity zapytań na adres IP.
- **A-2:** do czasu sesji o dostępie zadania leżą w publicznym repozytorium.

## 8. Co dalej

- Ręczna próba prowadzącego przed rozmową (B-019).
- Sesja o zamknięciu publicznego dostępu (B-020).
- Uzupełnienie poziomów zadań (B-023) i aktualizacja dokumentów JavaWorldTest (B-026).
- Otwarte: czy prowadzący nadal potrzebuje przejęcia sterowania ekranem kandydata (OQ-7).
