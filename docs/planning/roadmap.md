# Roadmap

Pełny opis wyniku sesji z 2026-11-19: [javaworld-tasks-plan.md](javaworld-tasks-plan.md).

Numeracja jest ciągiem dalszym roadmapy repozytorium JavaWorldTest
(`docs/planning/roadmap.md`, decyzje D-001–D-013 i backlog B-001–B-013 z 2026-11-18).
Tamte wpisy nie są tu powtarzane; kolumny „Zależy od” i „Zastępuje” odwołują się do nich po ID.

## Historia decyzji

| ID | Data | Temat | Decyzja | Status | Zależy od | Zastąpiona przez | Uzasadnienie | Rozważane alternatywy | Zaakceptowane ryzyka |
|----|------|-------|---------|--------|-----------|------------------|--------------|-----------------------|----------------------|
| D-014 | 2026-11-19 | Źródło prawdy | Wzorcem zadania jest plik `.md` w rekru-platform. Kod Javy z archiwum `src/` JavaWorldTest, treść i wersja TS według paczek `online/`. Paczki `online/` są zamrożone jako archiwum. Zastępuje D-007, D-008, D-009. | aktywna | I-1, I-2 | – | Prawdziwe importy JUnit/SLF4J działają na nakładce platformy i w projekcie Gradle, więc jeden plik obsługuje oba środowiska. | Archiwum `src/` bez zmian; paczki jednoplikowe jako pliki zadań; wzorzec w JavaWorldTest z generatorem `.md` | – |
| D-015 | 2026-11-19 | Wersja Javy | Java 17 na platformie (Judge0 id 91, JDK 17.0.6) i w paczce do IDE. Zastępuje D-013. | aktywna | D-014, A-1 | – | Publiczny Judge0 ma tylko Javę 13 i 17. 17 daje `record`, text blocki i `switch` jako wyrażenie i jest wersją LTS. Sprawdzone na żywo 2026-11-19. | Java 13 wszędzie; własna instancja Judge0 z Javą 21/25 | – |
| D-016 | 2026-11-19 | Log (Java) | Runner testów platformy nazywa wątek testów `Test worker`. W paczce do IDE `logback.xml` ma `[Test worker]` wpisane na stałe. Uzupełnia D-006. | aktywna | D-015, SC-2 | – | Na Judge0 wątek nazywa się `main`, a w IDE nazwa zależy od sposobu uruchomienia. Stała nazwa daje log zgodny co do znaku. | Stały tekst w nakładce loggera; zmiana opisu na `[main]`; pomijanie nazwy wątku | – |
| D-017 | 2026-11-19 | Log (TS) | Logger TS jest plikiem zadania `logger.ts` (tylko do odczytu) i pisze przez `console.log` w formacie logback. | aktywna | D-014, SC-2 | – | Ten sam kod na platformie i w IDE, bez zmian w platformie. | Logger wbudowany w runner TS; `console.info` jak w archiwum | – |
| D-018 | 2026-11-19 | Paczka do IDE | Projekt do IDE powstaje jako ZIP generowany w przeglądarce z bieżącego stanu plików, z przycisku na ekranie kandydata i prowadzącego. | aktywna | I-3 | – | Działa dla każdego zadania i zachowuje pracę kandydata przy przejściu na plan B. | Gotowe ZIP-y ze skryptu; funkcja i skrypt jednocześnie | R-1 |
| D-019 | 2026-11-19 | Paczka do IDE | Java: Gradle z wrapperem, poziom języka 17, JUnit 5, AssertJ, SLF4J, Logback. | aktywna | D-015, D-018 | – | Zgodne z JavaWorldTest; kandydat nie instaluje Gradle. | Maven; Gradle bez wrappera | R-1 |
| D-020 | 2026-11-19 | Paczka do IDE | TypeScript: Vitest, `npm install` i `npm test`. | aktywna | D-017, D-018 | – | Jedna zależność, brak konfiguracji TS, składnia jak na platformie. | Jest + ts-jest | R-1 |
| D-021 | 2026-11-19 | Kształt zadania | Opis po angielsku w panelu i ten sam komentarz w kodzie; `Calculator` jako osobny plik tylko do odczytu; Anagram w jednym pliku z klasą zagnieżdżoną; w TS dodatkowo `logger.ts`; bez pola `level`. Utrzymuje D-005 i D-011. | aktywna | D-014 | – | Zadanie wygląda tak samo na platformie i w IDE, a treść jest taka jak na dotychczasowych rozmowach. | Opis tylko w panelu; opis po polsku | – |
| D-022 | 2026-11-19 | Kształt zadania | Bez licznika czasu (brak pola `duration`). Platforma nie pokazuje wtedy zegara; wcześniej stoper był widoczny zawsze. | aktywna | D-021 | – | Czas kontroluje prowadzący, jak dotąd. | Licznik dla każdego zadania | – |
| D-023 | 2026-11-19 | Lokalizacja | Pliki zadań leżą w katalogu `tasks/`, który nie jest pokazywany na stronie głównej. | aktywna | A-2 | – | Kandydat, który wejdzie na stronę główną, nie widzi listy zadań. | `examples/`; poza repo platformy | Zadania są widoczne w repozytorium na GitHubie (A-2, B-020) |
| D-024 | 2026-11-19 | Weryfikacja | Testy automatyczne: `npm test` sprawdza stan początkowy i log 6 zadań, `npm run test:judge0` to samo dla Javy na Judge0, `npm run test:ide` uruchamia wygenerowane paczki przez Gradle i npm. Do tego ręczna próba prowadzącego. | aktywna | SC-1, SC-2, SC-3 | – | Każda późniejsza zmiana platformy jest sprawdzana bez ręcznej powtórki. | Tylko ręcznie; automat bez paczek | – |
| D-025 | 2026-11-19 | Dystrybucja | Prowadzący wgrywa plik z `tasks/` na stronie głównej, kopiuje link i wysyła na czacie. Kandydat udostępnia ekran. Alternatywą i planem B jest przycisk „Pobierz projekt (IDE)”. Indeks zadań z poziomami: `tasks/README.md`. Zastępuje D-001 i D-010. | aktywna | D-018, D-023 | – | Wykorzystuje istniejący przepływ platformy, bez nowego kodu. | Linki generowane skryptem (B-021) | – |
| D-026 | 2026-11-19 | Dokumentacja | Roadmapa powstaje w rekru-platform (numeracja ciągła), a w roadmapie JavaWorldTest zastąpione decyzje dostają status „zastąpiona”. | aktywna | – | – | Historia decyzji jest spójna w obu repozytoriach. | Tylko roadmapa w rekru-platform | – |
| D-027 | 2026-11-19 | Kształt zadania | Literówka `EXPCTED RESULTS` poprawiona na `EXPECTED RESULTS` w opisie i w komentarzu kodu. Wyjątek od treści „co do słowa” z D-021. | aktywna | D-021 | – | Czytelniejsze dla kandydata. | Zostawić jak w repo | – |
| D-028 | 2026-11-19 | Wdrożenie | Po przejściu testów automatycznych zmiany są commitowane, scalane do `main` i wypychane, czyli produkcyjne wdrożenie zmienia się przed ręczną próbą prowadzącego. | aktywna | D-024 | – | Rozmowa 2026-11-19 o 13:30; prowadzący chce sprawdzić wdrożenie pod docelowym adresem. | Commit i push gałęzi (podgląd); tylko commit lokalny | R-2 |

Status: `aktywna` / `otwarta ponownie` / `zastąpiona`. Zastąpionych decyzji nie usuwaj, bo stanowią historię rewizji.

## Backlog

| ID | Element | Priorytet (MoSCoW) | Status | Powiązane decyzje | Notatki |
|----|---------|--------------------|--------|-------------------|---------|
| B-014 | 6 zadań w `tasks/` (refaktoryzacja, anagram, kolekcje × Java, TS) | Must | zrobione (2026-11-19) | D-014, D-021, D-022, D-023, D-027 | |
| B-015 | Test stanu początkowego `test/tasks.test.ts` | Must | zrobione (2026-11-19) | D-024 | Lokalny JDK i harness TS w `npm test`; Judge0 na żądanie (`npm run test:judge0`). |
| B-016 | Platforma na Javie 17 (Judge0 id 91) | Must | zrobione (2026-11-19) | D-015 | |
| B-017 | Wątek testów `Test worker` w runnerze Javy | Must | zrobione (2026-11-19) | D-016 | |
| B-018 | Paczka do IDE: ZIP z projektem Gradle / npm, przyciski u kandydata i prowadzącego | Must | zrobione (2026-11-19) | D-018, D-019, D-020 | Gradle 9.9.0 z wrapperem, Vitest. `npm run test:ide` uruchamia paczki 6 zadań przez Gradle i npm i porównuje wynik z platformą (SC-3). |
| B-019 | Ręczna próba prowadzącego na wdrożeniu: 6 zadań w przeglądarce, paczka w IntelliJ i VS Code | Must | zrobione (2026-11-19) | D-024, D-028 | SC-3 w samym IDE nie jest pokryte testem automatycznym (test uruchamia paczkę z linii poleceń). 2026-11-19: prowadzący potwierdził po wdrożeniu commita `202b4bd`, że działa; zakres jego próby nie został opisany. |
| B-020 | Zamknięcie publicznego dostępu do zadań (osobna sesja planistyczna) | Should | do zrobienia | D-023 | Dziś zadania są w publicznym repozytorium (A-2). |
| B-021 | Generator linków do zadań w `tasks/README.md` | Could | do zrobienia | D-025 | Odpowiednik dawnego `check:online`. |
| B-022 | Własna instancja Judge0 z Javą 21/25 | Won't (na razie) | odłożone | D-015 | Płatny serwer, zmienia założenie A-1. |
| B-023 | Uzupełnić poziomy zadań w `tasks/README.md` | Should | do zrobienia | D-021, D-025 | Uzupełnia prowadzący. |
| B-024 | Sprawdzić długość linków do zadań na czacie spotkania | Should | do zrobienia | D-025 | Przejmuje B-009 z JavaWorldTest. 2026-11-19: linki mają 575–2444 znaków (najdłuższy: refaktoryzacja TS). |
| B-028 | Sprawdzić w panelu Cloudflare, czy zmienna `JAVA_LANGUAGE_ID` nie jest ustawiona na `62` | Must | do zrobienia | D-015 | Zmienna z panelu nadpisuje wartość z `wrangler.toml`. |
| B-025 | Przejrzeć i wysyłać kandydatom wymagania środowiska | Should | do zrobienia | D-019, D-020 | Tekst: [wymagania-kandydata.md](wymagania-kandydata.md). |
| B-026 | Zaktualizować `CLAUDE.md` i `online/README.md` w JavaWorldTest (rozmowy odbywają się na rekru-platform) | Should | do zrobienia | D-014, D-025 | |
| B-027 | Sesja planistyczna: zadania z użyciem promptów | Could | do zrobienia | – | Przeniesione z kontekstu roadmapy JavaWorldTest. |

## Otwarte pytania

- OQ-7: czy prowadzący nadal potrzebuje przejęcia sterowania ekranem kandydata (B-001 i B-002 w JavaWorldTest)? Na platformie kandydat pisze sam, a prowadzący ogląda udostępniony ekran. Ta sesja tego nie rozstrzygnęła.
- OQ-8: czy po sesji o dostępie (B-020) zadania zostają w tym repozytorium?

## Założenia

- A-1: platforma zostaje na darmowych usługach, bez płatnego serwera budującego.
- A-2: do czasu sesji o dostępie (B-020) zadania mogą leżeć w publicznym repozytorium.
- I-4: kandydat dostaje wymagania środowiska przed rozmową; kto ich nie spełnia, pracuje w przeglądarce.

## Zaakceptowane ryzyka

- R-1: paczka do IDE powstała pod presją czasu (rozmowa tego samego dnia). Decyzje D-018–D-020 zapadły w trybie skróconym.
- R-2: wdrożenie na `main` przed ręczną próbą prowadzącego (D-028). Błąd niewykryty przez testy automatyczne trafia od razu pod adres dla kandydata.

## Kontekst dla kolejnych sesji

- Sesja z 2026-11-19 zamknięta po jawnym potwierdzeniu prowadzącego. Zmiany wdrożone commitem `202b4bd` na `main`; CI przeszło.

- Najbliższa sesja: zamknięcie publicznego dostępu do zadań (B-020). Kolejna: zadania z promptami (B-027).
- Kryteria sukcesu tej sesji: SC-1 (ten sam stan początkowy), SC-2 (log zgodny z `EXPECTED RESULTS`), SC-3 (paczka do IDE daje ten sam wynik co platforma).
- Publiczny Judge0 (`ce.judge0.com`, wersja 1.14.0) ma Javę 13 (id 62) i 17 (id 91). Javy 21 i 25 nie ma.
- SQL jest oceniany poza tym repozytorium.
