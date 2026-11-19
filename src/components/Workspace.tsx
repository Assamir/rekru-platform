import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeJavaDependencies, analyzePackageJson, cdnPackages, readTsConfig } from '../lib/buildFiles';
import { downloadIdeProject } from '../lib/ideZip';
import { configureTypeScript, languageForPath, modelUri, monaco } from '../lib/monaco';
import { decodeTask, taskId } from '../lib/share';
import { fileRole, isTestFile, parseTask, serializeTask, type Task, type TaskFile } from '../lib/task';
import { runJava } from '../runners/java/runJava';
import { runTypeScript } from '../runners/ts/runTypeScript';
import type { Diagnostic, RunResult } from '../runners/types';
import { Markdown } from './Markdown';
import { ResultsPanel } from './ResultsPanel';

type Loaded = { task: Task; id: string } | { error: string };

export default function Workspace({ payload, accessCode }: { payload: string; accessCode?: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const md = await decodeTask(payload);
        setLoaded({ task: parseTask(md), id: await taskId(payload) });
      } catch (e) {
        setLoaded({ error: e instanceof Error && e.name === 'TaskParseError' ? e.message : 'Link jest niepełny lub uszkodzony. Poproś rekrutera o nowy link.' });
      }
    })();
  }, [payload]);

  if (!loaded) return <div className="loading">Wczytywanie zadania…</div>;
  if ('error' in loaded) {
    return (
      <div className="loading">
        <div className="alert error">{loaded.error}</div>
        <a className="btn" href="#">
          Strona główna
        </a>
      </div>
    );
  }
  return <WorkspaceView task={loaded.task} id={loaded.id} accessCode={accessCode} />;
}

// ---------------------------------------------------------------- pamięć lokalna

const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* brak miejsca / tryb prywatny */
    }
  },
};

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function Timer({ id, durationMin }: { id: string; durationMin?: number }) {
  const key = `rekru:${id}:startedAt`;
  const [start, setStart] = useState<number>(() => {
    const saved = store.get<number | null>(key, null);
    if (saved) return saved;
    const now = Date.now();
    store.set(key, now);
    return now;
  });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = now - start;
  const limit = durationMin ? durationMin * 60_000 : null;
  const over = limit !== null && elapsed > limit;
  const reset = () => {
    if (!confirm('Wyzerować licznik czasu?')) return;
    const n = Date.now();
    store.set(key, n);
    setStart(n);
  };
  return (
    <button className={`timer ${over ? 'over' : ''} ${limit && elapsed > limit * 0.8 && !over ? 'soon' : ''}`} onClick={reset} title="Kliknij, aby wyzerować">
      ⏱ {formatClock(elapsed)}
      {limit !== null && <span className="muted"> / {durationMin} min</span>}
    </button>
  );
}

// ---------------------------------------------------------------- przeciąganie paneli

function useDrag(onMove: (e: PointerEvent) => void) {
  return (e: React.PointerEvent) => {
    e.preventDefault();
    document.body.classList.add('dragging');
    const move = (ev: PointerEvent) => onMove(ev);
    const up = () => {
      document.body.classList.remove('dragging');
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
}

// ---------------------------------------------------------------- widok

function WorkspaceView({ task, id, accessCode }: { task: Task; id: string; accessCode?: string }) {
  const filesKey = `rekru:${id}:files`;
  const visible = useMemo(() => task.files.filter((f) => !f.hidden), [task]);
  const [active, setActive] = useState<string>(() => {
    const editable = visible.find((f) => !f.readonly && fileRole(task.language, f.path) === 'code');
    return (editable ?? visible[0]).path;
  });
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [fontSize, setFontSize] = useState(() => store.get('rekru:fontSize', 15));
  const [leftWidth, setLeftWidth] = useState(() => store.get('rekru:leftWidth', 34));
  const [bottomHeight, setBottomHeight] = useState(() => store.get('rekru:bottomHeight', 34));
  const [showTask, setShowTask] = useState(true);

  const editorHost = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const models = useRef(new Map<string, monaco.editor.ITextModel>());
  const runRef = useRef<() => void>(() => {});
  const mainRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  const unsupportedDeps = useMemo(() => {
    if (task.language === 'java') return analyzeJavaDependencies(task.files).filter((d) => !d.supported).map((d) => `${d.group}:${d.name} – ${d.note}`);
    const pkg = task.files.find((f) => /(^|\/)package\.json$/.test(f.path));
    return pkg ? analyzePackageJson(pkg.content).packages.filter((p) => !p.supported).map((p) => `${p.name} – ${p.note}`) : [];
  }, [task]);

  const currentFiles = useCallback(
    (): TaskFile[] => task.files.map((f) => ({ ...f, content: models.current.get(f.path)?.getValue() ?? f.content })),
    [task],
  );

  const applyTsConfig = useCallback(() => {
    if (task.language !== 'typescript') return {};
    const files = currentFiles();
    const pkg = files.find((f) => /(^|\/)package\.json$/.test(f.path));
    const tsconfig = files.find((f) => /(^|\/)tsconfig\.json$/.test(f.path));
    const { map, dts } = cdnPackages(pkg ? analyzePackageJson(pkg.content).packages : []);
    configureTypeScript({ tsconfig: tsconfig ? readTsConfig(tsconfig.content) : undefined, packagesDts: dts });
    return map;
  }, [task, currentFiles]);

  // Edytor + modele
  useEffect(() => {
    const saved = store.get<Record<string, string>>(filesKey, {});
    for (const f of task.files) {
      const uri = modelUri(f.path);
      const content = !f.readonly && saved[f.path] !== undefined ? saved[f.path] : f.content;
      const model = monaco.editor.getModel(uri) ?? monaco.editor.createModel(content, languageForPath(f.path), uri);
      model.setValue(content);
      model.updateOptions({ tabSize: task.language === 'java' ? 4 : 2, insertSpaces: true });
      models.current.set(f.path, model);
    }
    setDirty(new Set(task.files.filter((f) => models.current.get(f.path)!.getValue() !== f.content).map((f) => f.path)));
    applyTsConfig();

    const editor = monaco.editor.create(editorHost.current!, {
      model: models.current.get(active) ?? null,
      theme: 'rekru-dark',
      automaticLayout: true,
      fontSize,
      fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontLigatures: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      smoothScrolling: true,
      padding: { top: 12 },
      bracketPairColorization: { enabled: true },
      readOnly: task.files.find((f) => f.path === active)?.readonly,
    });
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => runRef.current());

    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    const subs = task.files.map((f) =>
      models.current.get(f.path)!.onDidChangeContent(() => {
        const value = models.current.get(f.path)!.getValue();
        setDirty((prev) => {
          const next = new Set(prev);
          if (value !== f.content) next.add(f.path);
          else next.delete(f.path);
          return next;
        });
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
          const data: Record<string, string> = {};
          for (const tf of task.files) if (!tf.readonly) data[tf.path] = models.current.get(tf.path)!.getValue();
          store.set(filesKey, data);
        }, 400);
      }),
    );

    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(saveTimer);
      subs.forEach((s) => s.dispose());
      editor.dispose();
      models.current.forEach((m) => m.dispose());
      models.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, filesKey]);

  useEffect(() => {
    const editor = editorRef.current;
    const model = models.current.get(active);
    if (!editor || !model) return;
    if (editor.getModel() !== model) editor.setModel(model);
    editor.updateOptions({ readOnly: !!task.files.find((f) => f.path === active)?.readonly });
    editor.focus();
  }, [active, task]);

  useEffect(() => {
    editorRef.current?.updateOptions({ fontSize });
    store.set('rekru:fontSize', fontSize);
  }, [fontSize]);
  useEffect(() => store.set('rekru:leftWidth', leftWidth), [leftWidth]);
  useEffect(() => store.set('rekru:bottomHeight', bottomHeight), [bottomHeight]);

  const jumpTo = useCallback((d: Diagnostic) => {
    if (!models.current.has(d.file)) return;
    const f = task.files.find((x) => x.path === d.file);
    if (f?.hidden) return;
    setActive(d.file);
    setTimeout(() => {
      const editor = editorRef.current;
      if (!editor) return;
      editor.revealLineInCenter(d.line);
      editor.setPosition({ lineNumber: d.line, column: d.column });
      editor.focus();
    }, 0);
  }, [task]);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setResult(null);
    for (const m of models.current.values()) monaco.editor.setModelMarkers(m, 'runner', []);
    try {
      const files = currentFiles().map((f) => ({ path: f.path, content: f.content }));
      let r: RunResult;
      if (task.language === 'java') {
        r = await runJava(files, accessCode);
      } else {
        const packages = applyTsConfig();
        r = await runTypeScript(files, { packages });
      }
      if (task.language === 'java' && r.diagnostics.length) {
        const byFile = new Map<string, monaco.editor.IMarkerData[]>();
        for (const d of r.diagnostics) {
          if (!byFile.has(d.file)) byFile.set(d.file, []);
          byFile.get(d.file)!.push({
            severity: monaco.MarkerSeverity.Error,
            message: d.message,
            startLineNumber: d.line,
            endLineNumber: d.line,
            startColumn: 1,
            endColumn: 1000,
          });
        }
        byFile.forEach((markers, file) => {
          const m = models.current.get(file);
          if (m) monaco.editor.setModelMarkers(m, 'runner', markers);
        });
      }
      setResult(r);
    } catch (e) {
      setResult({ kind: 'infra-error', tests: [], console: [], diagnostics: [], errorText: String(e), durationMs: 0, engine: '' });
    } finally {
      setRunning(false);
    }
  }, [running, currentFiles, task, accessCode, applyTsConfig]);
  runRef.current = run;

  function resetActive() {
    const f = task.files.find((x) => x.path === active);
    if (!f || f.readonly) return;
    if (!confirm(`Przywrócić oryginalną treść pliku ${f.path}? Twoje zmiany w tym pliku zostaną utracone.`)) return;
    models.current.get(f.path)?.setValue(f.content);
  }

  function downloadSolution() {
    const md = serializeTask(task, currentFiles(), { exported_at: new Date().toISOString() });
    const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
    const slug = task.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const a = Object.assign(document.createElement('a'), { href: url, download: `rozwiazanie-${slug || 'zadanie'}.md` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function downloadIde() {
    try {
      await downloadIdeProject(task, currentFiles());
    } catch (e) {
      alert(`Nie udało się przygotować projektu: ${(e as Error).message}`);
    }
  }

  const onDragLeft = useDrag((e) => {
    const rect = mainRef.current!.getBoundingClientRect();
    setLeftWidth(Math.min(60, Math.max(18, ((e.clientX - rect.left) / rect.width) * 100)));
  });
  const onDragBottom = useDrag((e) => {
    const rect = rightRef.current!.getBoundingClientRect();
    setBottomHeight(Math.min(75, Math.max(12, ((rect.bottom - e.clientY) / rect.height) * 100)));
  });

  const activeFile = task.files.find((f) => f.path === active);

  return (
    <div className="workspace">
      <header className="ws-header">
        <div className="ws-title">
          <span className="brand-mark small">✓</span>
          <h1 title={task.title}>{task.title}</h1>
          <span className={`badge lang-${task.language}`}>{task.language === 'java' ? 'Java' : 'TypeScript'}</span>
          {task.level && <span className="badge">{task.level}</span>}
          {unsupportedDeps.length > 0 && (
            <span className="badge warn" title={unsupportedDeps.join('\n')}>
              ⚠ {unsupportedDeps.length} niedostępne zależności
            </span>
          )}
        </div>
        <div className="ws-actions">
          {/* Zadanie bez pola `duration` nie pokazuje zegara – czas kontroluje wtedy prowadzący. */}
          {task.durationMin !== undefined && <Timer id={id} durationMin={task.durationMin} />}
          <div className="font-size" title="Rozmiar czcionki">
            <button onClick={() => setFontSize((s) => Math.max(11, s - 1))}>A−</button>
            <button onClick={() => setFontSize((s) => Math.min(28, s + 1))}>A+</button>
          </div>
          <button className="btn" onClick={downloadSolution} title="Pobierz zadanie z Twoim kodem (.md)">
            ↓ Pobierz
          </button>
          <button
            className="btn"
            onClick={downloadIde}
            title={`Pobierz zadanie z Twoim kodem jako projekt ${task.language === 'java' ? 'Gradle' : 'npm'} do IntelliJ / VS Code (.zip)`}
          >
            ↓ Pobierz projekt (IDE)
          </button>
          <button className="btn primary run" onClick={run} disabled={running} title="Ctrl+Enter">
            {running ? 'Uruchamianie…' : '▶ Uruchom testy'}
          </button>
        </div>
      </header>


      <div className="ws-main" ref={mainRef}>
        {showTask && (
          <>
            <aside className="ws-task" style={{ width: `${leftWidth}%` }}>
              <div className="ws-task-head">
                <span>Zadanie</span>
                <button className="icon-btn" onClick={() => setShowTask(false)} title="Ukryj opis">
                  «
                </button>
              </div>
              <Markdown source={task.description} className="ws-task-body" />
            </aside>
            <div className="splitter vertical" onPointerDown={onDragLeft} />
          </>
        )}
        <section className="ws-right" ref={rightRef}>
          <div className="tabs">
            {!showTask && (
              <button className="tab show-task" onClick={() => setShowTask(true)} title="Pokaż opis zadania">
                »
              </button>
            )}
            {visible.map((f) => (
              <button key={f.path} className={`tab ${f.path === active ? 'active' : ''}`} onClick={() => setActive(f.path)} title={f.path}>
                {isTestFile(task, f) && <span className="tab-dot test" />}
                {f.path.split('/').pop()}
                {f.readonly && <span className="lock">🔒</span>}
                {dirty.has(f.path) && <span className="modified">●</span>}
              </button>
            ))}
            <div className="tabs-spacer" />
            {activeFile && !activeFile.readonly && (
              <button className="tab-action" onClick={resetActive} title="Przywróć oryginalną treść pliku">
                ↺ Resetuj plik
              </button>
            )}
          </div>
          <div className="editor-host">
            <div ref={editorHost} className="editor" />
          </div>
          <div className="splitter horizontal" onPointerDown={onDragBottom} />
          <div className="ws-bottom" style={{ height: `${bottomHeight}%` }}>
            <ResultsPanel result={result} running={running} onJump={jumpTo} />
          </div>
        </section>
      </div>
    </div>
  );
}
