# Platforma do rekrutacji technicznej – QA Automation (Java / TypeScript)

Prosta platforma do live-codingu na rozmowach z testerami automatyzującymi.
**Bez logowania, bez bazy danych, w 100% na darmowych usługach.**

1. Rekruter wgrywa **jeden plik `.md` = jedno zadanie** (opis + pliki z kodem + opcjonalnie `build.gradle` / `package.json`).
2. Platforma generuje **link** – zadanie jest zakodowane w samym linku (część po `#`, nie trafia na serwer).
3. Kandydat otwiera link, **udostępnia ekran** i rozwiązuje zadanie w edytorze (Monaco – ten sam co w VS Code),
   uruchamiając testy przyciskiem ▶ lub `Ctrl+Enter`.

| | Java | TypeScript |
|---|---|---|
| Kompilacja i uruchomienie | [Judge0 CE](https://ce.judge0.com) (publiczna, darmowa instancja, Java 17) | w przeglądarce kandydata (kompilator TS z Monaco + Web Worker) |
| Testy | JUnit 5 (`@Test`, `@BeforeEach`, `@ParameterizedTest` + `@ValueSource` / `@CsvSource` / `@MethodSource`, `@DisplayName`, `@Disabled`…) | składnia Vitest / Jest: `describe`, `it`, `test.each`, hooki, `expect`, `vi.fn` / `jest.fn`, `vi.spyOn` |
| Asercje | JUnit `Assertions.*` + AssertJ `assertThat(...)` (podzbiór) | `toBe`, `toEqual`, `toMatchObject`, `toThrow`, `resolves/rejects`, matchery mocków… |
| Logowanie | SLF4J / Log4j 2 (`LoggerFactory.getLogger`, `LogManager.getLogger`) → konsola, wzorzec `HH:mm:ss.SSS [Test worker] INFO  Klasa - komunikat` | `console.*` → konsola |
| Zależności | `build.gradle` / `pom.xml` – analizowane, obsługiwane: JUnit 5, AssertJ, SLF4J, Log4j, Logback | `package.json` – paczki ładowane z [esm.sh](https://esm.sh) (np. `zod`, `dayjs`) |

## Format pliku zadania

````markdown
---
title: Koszyk – testy jednostkowe
language: java          # java | typescript
duration: 45            # minuty (opcjonalnie; bez tego pola kandydat nie widzi zegara)
level: mid              # opcjonalnie
---

# Opis zadania
Dowolny Markdown: wymagania, tabele, wskazówki…

```java file=Cart.java readonly
public class Cart { ... }
```

```java file=CartTest.java
class CartTest { ... }
```

```groovy file=build.gradle readonly
dependencies { testImplementation 'org.junit.jupiter:junit-jupiter:5.10.2' }
```
````

* Każdy blok kodu z atrybutem `file=ścieżka` staje się plikiem w edytorze. Bloki bez `file=` zostają w opisie.
* Flagi: `readonly` – tylko do odczytu, `hidden` – niewidoczny, ale kompilowany/uruchamiany (np. testy akceptacyjne rekrutera).
  Uwaga: ukryte pliki są w linku, więc dociekliwy kandydat może je odczytać.
* Dozwolone pliki – Java: `.java`, `build.gradle(.kts)`, `settings.gradle`, `pom.xml`, `.properties`, `.xml`, `.json`, `.csv`, `.txt`, `.md`;
  TypeScript: `.ts`, `.tsx`, `package.json`, `tsconfig.json` (uwzględniane są flagi `strict*`, `noImplicit*`, `noUnused*`), `.json` (można importować), `.csv`, `.txt`, `.md`.
* TypeScript: testy to pliki `*.test.ts` / `*.spec.ts`. Importy z `vitest`, `@jest/globals`, `node:test`, `node:assert` działają.
* Java: wszystkie pliki są składane w jeden `Main.java`, więc **nie używaj nazw klas** `Main`, `Assertions`, `Test` itp.
  `package` jest ignorowany. Kod kompiluje **Java 17** (JDK 17.0.6 w Judge0 CE) – działają `record`, text blocki,
  `switch` jako wyrażenie i pattern matching w `instanceof`; nie ma składni z Javy 21+.
  Testy wykonują się w wątku `Test worker` (tak jak w Gradle), więc logi wyglądają tak samo jak w projekcie Gradle.
* Gotowe przykłady: katalog [`examples/`](examples) (do pobrania też ze strony głównej).

Kandydat może pobrać swoje rozwiązanie przyciskiem **Pobierz** – to ten sam format `.md`, więc można je ponownie wgrać i przejrzeć.

## Paczka do IDE (IntelliJ / VS Code)

Przycisk **Pobierz projekt (IDE)** – u kandydata (z jego bieżącym kodem) i u rekrutera (podgląd wgranego zadania) – generuje
w przeglądarce plik ZIP z tym samym zadaniem jako zwykłym projektem. To plan B, gdy platforma lub Judge0 nie działa, oraz
ścieżka dla kandydata, który woli własne IDE.

| | Java | TypeScript |
|---|---|---|
| Projekt | Gradle z wrapperem (`gradlew test`), poziom języka 17 | npm + Vitest (`npm install`, `npm test`) |
| Wymagania u kandydata | JDK 17 lub nowszy, internet przy pierwszym uruchomieniu (Gradle, Maven Central) | Node.js 20 lub nowszy, internet przy `npm install` |
| Biblioteki | JUnit 5, AssertJ, SLF4J + Logback (Log4j 2 przez most, gdy zadanie go importuje) | `vitest`, `typescript` + zależności z `package.json` zadania |
| Układ plików | testy w `src/test/java`, pozostałe klasy w `src/main/java` (pakiet domyślny), dane w `src/test/resources` | pliki pod ścieżkami z zadania |
| Logi | `logback.xml` ze wzorcem platformy i stałą nazwą wątku `[Test worker]`; `gradlew test` wypisuje je bez wcięć | `console.*` jako zwykłe linie (`disableConsoleIntercept`) |

* `README.md` w paczce zawiera opis zadania i instrukcję uruchomienia. Pliki `hidden` też trafiają do paczki.
* Java: pliki budowania dołączone do zadania (`build.gradle`, `settings.gradle`, `pom.xml`) są zastępowane plikami paczki;
  linie `package` są usuwane tak jak na platformie.
* TypeScript: `describe` / `test` / `expect` / `vi` działają bez importów (`globals: true`); gdy zadanie używa `jest.fn()`,
  paczka mapuje `jest` na `vi`. Importy z `@jest/globals` i `node:test` w paczce nie działają.
* Test na prawdziwych narzędziach (wolny, wymaga internetu): `npm run test:ide`.

## Uruchomienie lokalne

```bash
npm install
npm run dev              # http://localhost:5173
npm test                 # testy jednostkowe (parser, runner Java z lokalnym JDK, runner TS, paczka do IDE)
npm run test:ide         # paczka do IDE na prawdziwym Gradle i npm (wolne, wymaga internetu)
npm run test:judge0      # zadania Java z tasks/ na prawdziwym Judge0 (wymaga internetu)
```

Bez internetu / z lokalnym JDK zamiast Judge0: utwórz `.env.local` z `JAVA_RUNNER=local` (wymaga `javac` i `java` w PATH,
JDK 17 lub nowszy; kod jest kompilowany z `--release 17`, czyli tak jak na Judge0).

## Wdrożenie na Cloudflare Pages (darmowe)

1. Wypchnij repozytorium na GitHub.
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → wybierz repozytorium.
3. Ustawienia budowania:
   * Framework preset: **None** (lub Vite)
   * Build command: `npm run build`
   * Build output directory: `dist`
   * (Environment variable `NODE_VERSION` = `22`, jeśli build zgłasza zbyt starą wersję Node)
4. **Save and Deploy**. Każdy push na `main` wdraża nową wersję, PR-y dostają podglądy.

Katalog `functions/` jest wykrywany automatycznie (Pages Functions – w darmowym planie 100 000 wywołań dziennie).
Alternatywnie z terminala: `npm run build && npx wrangler pages deploy dist`.

### Zmienne środowiskowe (opcjonalne)

| Zmienna | Opis |
|---|---|
| `JUDGE0_URL` | Adres Judge0. Domyślnie `https://ce.judge0.com`. Może być własna instancja lub `https://judge0-ce.p.rapidapi.com`. |
| `JUDGE0_KEY` | Klucz RapidAPI (darmowy plan Basic: ~50 uruchomień dziennie). Włącza tryb proxy. |
| `JUDGE0_AUTH_TOKEN` | Token `X-Auth-Token` dla własnej instancji Judge0. Włącza tryb proxy. |
| `JAVA_LANGUAGE_ID` | ID języka w Judge0 (domyślnie `91` = Java, JDK 17.0.6; `62` = OpenJDK 13). |
| `ACCESS_CODE` | Kod dostępu – rekruter dołącza go do linku; bez niego `/api/run` odmawia. Chroni przed nadużyciem proxy. |

**Tryby wywołania Judge0:**
* *direct* (domyślny, gdy brak klucza/tokenu/kodu) – przeglądarka kandydata woła Judge0 bezpośrednio.
  Limit zapytań liczony jest per IP kandydata, nie per wspólne IP Cloudflare. Jeśli bezpośrednie połączenie się nie uda,
  aplikacja automatycznie próbuje przez `/api/run`.
* *proxy* – zapytania idą przez funkcję Cloudflare `/api/run`, która dokłada sekrety (klucz nigdy nie trafia do przeglądarki).

Dzięki trybowi *direct* aplikacja działa także na dowolnym statycznym hostingu (GitHub Pages, Netlify) – wtedy po prostu nie ma `/api`.

## Architektura

```
src/
  components/Home.tsx          strona rekrutera: upload → podgląd → link
  components/Workspace.tsx     strona kandydata: opis, edytor, wyniki, licznik czasu
  lib/task.ts                  parser i serializer formatu .md
  lib/share.ts                 kompresja zadania do linku (deflate + base64url)
  lib/buildFiles.ts            analiza build.gradle / pom.xml / package.json / tsconfig.json
  lib/ideProject.ts            paczka do IDE: zadanie → pliki projektu Gradle / npm (czysta funkcja)
  lib/ideZip.ts                pakowanie paczki do ZIP i pobranie w przeglądarce
  lib/ideTemplates/            gradlew, gradlew.bat (szablony); gradle-wrapper.jar leży w public/ide/
  runners/java/                składanie Main.java, shim JUnit 5 + AssertJ + SLF4J, parsowanie wyników
  runners/ts/                  mini Vitest/Jest (harness, expect, mocki), loader CommonJS, Web Worker
functions/api/run.ts           Cloudflare Pages Function – proxy do Judge0
functions/api/config.ts        publiczna konfiguracja (tryb, silnik, czy wymagany kod)
examples/                      przykładowe zadania (do pobrania ze strony głównej)
tasks/                         zadania rekrutacyjne + indeks dla prowadzącego (tasks/README.md); nie są na stronie głównej
docs/planning/                 decyzje i backlog (roadmap.md), wynik sesji planistycznej
```

## Ograniczenia (wersja darmowa)

* Java: tylko JUnit 5, AssertJ (podzbiór), SLF4J/Log4j (+ cała biblioteka standardowa JDK 17). Mockito, RestAssured,
  Selenium itp. wymagałyby prawdziwego `gradle test` na serwerze budującym (płatny kontener) – platforma pokazuje
  ostrzeżenie, gdy zadanie deklaruje takie zależności. Brak `@Nested`, `@TempDir`, `@EnumSource`.
* Publiczny Judge0 ma limity zapytań – przy większej liczbie rozmów rozważ darmowy klucz RapidAPI lub własną instancję.
* TypeScript: brak modułów Node.js (`fs`, `http`), brak `vi.useFakeTimers` i snapshotów; Playwright/Selenium nie zadziałają w przeglądarce.
* Postęp kandydata zapisuje się w `localStorage` jego przeglądarki – nie na serwerze. Rozwiązanie można pobrać przyciskiem **Pobierz**.
