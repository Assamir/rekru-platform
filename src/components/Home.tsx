import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeJavaDependencies, analyzePackageJson, type DependencyStatus, type NpmPackage } from '../lib/buildFiles';
import { useConfig } from '../lib/config';
import { downloadIdeProject } from '../lib/ideZip';
import { buildShareUrl } from '../lib/share';
import { fileRole, isTestFile, parseTask, TaskParseError, type Task } from '../lib/task';
import { Markdown } from './Markdown';

const EXAMPLES = import.meta.glob('../../examples/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const exampleList = Object.entries(EXAMPLES).map(([path, content]) => ({
  file: path.split('/').pop()!,
  content,
  title: /^title:\s*(.+)$/m.exec(content)?.[1] ?? path,
}));

const ACCESS_KEY = 'rekru:recruiter:accessCode';
const LANG_LABEL = { java: 'Java', typescript: 'TypeScript' } as const;

interface Loaded {
  fileName: string;
  markdown: string;
  task: Task;
}

function readStorage(key: string) {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/markdown;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Home() {
  const config = useConfig();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [accessCode, setAccessCode] = useState(() => readStorage(ACCESS_KEY));
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function load(fileName: string, markdown: string) {
    setCopied(false);
    try {
      const task = parseTask(markdown, fileName);
      setLoaded({ fileName, markdown, task });
      setError(null);
    } catch (e) {
      setLoaded(null);
      setError(e instanceof TaskParseError ? e.message : `Nie udało się wczytać pliku: ${(e as Error).message}`);
    }
  }

  async function onFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    if (list.length > 1) {
      setError('Wgraj jeden plik – jeden plik to jedno zadanie.');
      return;
    }
    const file = list[0];
    if (file.size > 512 * 1024) {
      setError('Plik jest zbyt duży (maks. 512 KB).');
      return;
    }
    load(file.name, await file.text());
  }

  useEffect(() => {
    try {
      localStorage.setItem(ACCESS_KEY, accessCode);
    } catch {
      /* tryb prywatny */
    }
  }, [accessCode]);

  useEffect(() => {
    if (!loaded) return setLink('');
    let cancelled = false;
    buildShareUrl(loaded.markdown, config?.accessCodeRequired ? accessCode : undefined).then((url) => !cancelled && setLink(url));
    return () => {
      cancelled = true;
    };
  }, [loaded, accessCode, config?.accessCodeRequired]);

  const deps = useMemo(() => {
    if (!loaded) return { java: [] as DependencyStatus[], npm: [] as NpmPackage[], npmError: undefined as string | undefined };
    const { task } = loaded;
    if (task.language === 'java') return { java: analyzeJavaDependencies(task.files), npm: [], npmError: undefined };
    const pkg = task.files.find((f) => /(^|\/)package\.json$/.test(f.path));
    const r = pkg ? analyzePackageJson(pkg.content) : { packages: [] };
    return { java: [], npm: r.packages, npmError: r.error };
  }, [loaded]);

  async function copy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const task = loaded?.task;

  return (
    <div className="home">
      <header className="home-header">
        <div className="brand">
          <span className="brand-mark">✓</span>
          <div>
            <h1>Rekrutacja techniczna</h1>
            <p>Zadania live-coding dla testerów automatyzujących · Java i TypeScript · bez logowania</p>
          </div>
        </div>
      </header>

      <main className="home-main">
        <section className="panel">
          <h2>
            <span className="step">1</span> Wgraj plik z zadaniem
          </h2>
          <div
            className={`dropzone ${dragging ? 'dragging' : ''}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onFiles(e.dataTransfer.files);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept=".md,.markdown,.txt" hidden onChange={(e) => onFiles(e.target.files)} />
            <div className="dropzone-icon">⇪</div>
            <strong>Przeciągnij plik .md lub kliknij, aby wybrać</strong>
            <span>Jeden plik = jedno zadanie (opis + pliki z kodem + opcjonalnie build.gradle / package.json)</span>
          </div>

          {error && <div className="alert error">{error}</div>}

          <div className="examples">
            <span className="muted">Przykładowe zadania:</span>
            {exampleList.map((ex) => (
              <div key={ex.file} className="example">
                <button className="link" onClick={() => load(ex.file, ex.content)}>
                  {ex.title}
                </button>
                <button className="icon-btn" title="Pobierz jako szablon" onClick={() => download(ex.file, ex.content)}>
                  ↓
                </button>
              </div>
            ))}
          </div>

          <details className="format-help">
            <summary>Format pliku zadania</summary>
            <pre>{`---
title: Koszyk – testy jednostkowe
language: java          # java | typescript
duration: 45            # minuty (opcjonalnie)
level: mid              # opcjonalnie
---

# Opis zadania (Markdown)
Treść, wymagania, wskazówki…

\`\`\`java file=Cart.java readonly
// kod tylko do odczytu
\`\`\`

\`\`\`java file=CartTest.java
// kod edytowany przez kandydata
\`\`\`

\`\`\`groovy file=build.gradle readonly
dependencies { testImplementation 'org.junit.jupiter:junit-jupiter:5.10.2' }
\`\`\``}</pre>
            <ul>
              <li>
                Bloki z <code>file=ścieżka</code> stają się plikami w edytorze. Flagi: <code>readonly</code>, <code>hidden</code> (uruchamiany, ale
                niewidoczny).
              </li>
              <li>
                <b>Java</b>: wbudowane JUnit 5 (w tym <code>@ParameterizedTest</code>), AssertJ, SLF4J / Log4j 2. Kod kompiluje Judge0 (Java 17).
              </li>
              <li>
                <b>TypeScript</b>: testy w plikach <code>*.test.ts</code> / <code>*.spec.ts</code> (składnia Vitest/Jest, <code>vi.fn</code>,{' '}
                <code>jest.fn</code>). Paczki z <code>package.json</code> ładowane są z esm.sh.
              </li>
            </ul>
          </details>
        </section>

        <section className={`panel ${task ? '' : 'panel-disabled'}`}>
          <h2>
            <span className="step">2</span> Sprawdź i wyślij link kandydatowi
          </h2>
          {!task && <p className="muted">Tu pojawi się podgląd zadania i link do wysłania.</p>}
          {task && loaded && (
            <>
              <div className="task-summary">
                <h3>{task.title}</h3>
                <div className="badges">
                  <span className={`badge lang-${task.language}`}>{LANG_LABEL[task.language]}</span>
                  {task.durationMin && <span className="badge">{task.durationMin} min</span>}
                  {task.level && <span className="badge">{task.level}</span>}
                  <span className="badge subtle">{loaded.fileName}</span>
                </div>
              </div>

              <ul className="file-list">
                {task.files.map((f) => {
                  const role = fileRole(task.language, f.path);
                  return (
                    <li key={f.path}>
                      <code>{f.path}</code>
                      {isTestFile(task, f) && <span className="tag test">testy</span>}
                      {role === 'config' && <span className="tag">budowanie</span>}
                      {role === 'data' && <span className="tag">dane</span>}
                      {f.readonly && <span className="tag">tylko odczyt</span>}
                      {f.hidden && <span className="tag warn">ukryty</span>}
                    </li>
                  );
                })}
              </ul>

              {(deps.java.length > 0 || deps.npm.length > 0 || deps.npmError) && (
                <div className="deps">
                  <h4>Zależności</h4>
                  {deps.npmError && <div className="alert error">{deps.npmError}</div>}
                  <ul>
                    {deps.java.map((d, i) => (
                      <li key={i} className={d.supported ? 'ok' : 'bad'}>
                        <span>{d.supported ? '✓' : '✗'}</span>
                        <code>{[d.group, d.name, d.version].filter(Boolean).join(':')}</code>
                        <small>{d.note}</small>
                      </li>
                    ))}
                    {deps.npm.map((p) => (
                      <li key={p.name} className={p.supported ? 'ok' : 'bad'}>
                        <span>{p.supported ? '✓' : '✗'}</span>
                        <code>
                          {p.name}@{p.range}
                        </code>
                        <small>{p.note}</small>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {task.files.some((f) => f.hidden) && (
                <div className="alert info">
                  Pliki ukryte nie są widoczne w edytorze, ale są zapisane w linku – technicznie dociekliwy kandydat może je odczytać.
                </div>
              )}

              <details className="preview">
                <summary>Podgląd opisu zadania</summary>
                <Markdown source={task.description} />
              </details>

              {config?.accessCodeRequired && (
                <label className="field">
                  <span>Kod dostępu do kompilatora (zostanie dołączony do linku)</span>
                  <input value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="ACCESS_CODE z ustawień Cloudflare" />
                </label>
              )}

              <div className="share">
                <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Link dla kandydata" />
                <button className="btn primary" onClick={copy} disabled={!link}>
                  {copied ? 'Skopiowano ✓' : 'Kopiuj link'}
                </button>
                <a className="btn" href={link} target="_blank" rel="noreferrer">
                  Otwórz ↗
                </a>
              </div>
              <div className="ide-download">
                <button className="btn" onClick={() => downloadIdeProject(task).catch((e: Error) => setError(`Nie udało się przygotować projektu: ${e.message}`))}>
                  ↓ Pobierz projekt (IDE)
                </button>
                <span className="muted small">
                  To samo zadanie jako projekt {task.language === 'java' ? 'Gradle (JUnit 5, JDK 17+)' : 'npm (Vitest, Node 20+)'} do IntelliJ / VS Code –
                  plan B albo dla kandydata, który woli własne IDE.
                </span>
              </div>
              <p className="muted small">
                Zadanie jest zapisane w samym linku (część po <code>#</code> nie trafia na serwer). Długość linku: {link.length.toLocaleString('pl-PL')}{' '}
                znaków{link.length > 30000 ? ' – link jest długi, niektóre komunikatory mogą go uciąć; wyślij go mailem.' : '.'}
              </p>
            </>
          )}
        </section>
      </main>

      <footer className="home-footer">
        <span>Podczas rozmowy kandydat udostępnia ekran i rozwiązuje zadanie w edytorze. Postęp zapisuje się lokalnie w jego przeglądarce.</span>
      </footer>
    </div>
  );
}
