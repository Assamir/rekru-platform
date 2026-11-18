import { useEffect, useMemo, useState } from 'react';
import { summarize, type Diagnostic, type RunResult, type TestResult } from '../runners/types';

type Tab = 'tests' | 'console' | 'problems';

const STATUS_ICON: Record<TestResult['status'], string> = { passed: '✓', failed: '✗', error: '!', skipped: '○' };

function TestRow({ t }: { t: TestResult }) {
  const [open, setOpen] = useState(t.status === 'failed' || t.status === 'error');
  const expandable = !!t.message && t.status !== 'passed';
  return (
    <li className={`test-row ${t.status}`}>
      <button className="test-head" onClick={() => expandable && setOpen(!open)} disabled={!expandable}>
        <span className="test-icon">{STATUS_ICON[t.status]}</span>
        <span className="test-name">{t.name}</span>
        {t.status === 'skipped' && t.message && <span className="muted small">({t.message})</span>}
        <span className="test-time">{t.status !== 'skipped' ? `${t.durationMs} ms` : ''}</span>
      </button>
      {expandable && open && <pre className="test-message">{t.message}</pre>}
    </li>
  );
}

export function ResultsPanel({
  result,
  running,
  onJump,
}: {
  result: RunResult | null;
  running: boolean;
  onJump: (d: Diagnostic) => void;
}) {
  const [tab, setTab] = useState<Tab>('tests');

  useEffect(() => {
    if (!result) return;
    if (result.kind === 'compile-error') setTab('problems');
    else if (result.kind === 'program' || (result.tests.length === 0 && result.console.length > 0)) setTab('console');
    else setTab('tests');
  }, [result]);

  const groups = useMemo(() => {
    const map = new Map<string, TestResult[]>();
    for (const t of result?.tests ?? []) {
      const key = t.suite || '(bez grupy)';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()];
  }, [result]);

  const sum = summarize(result?.tests ?? []);
  const problems = result?.diagnostics.length ?? 0;

  return (
    <div className="results">
      <div className="results-tabs">
        <button className={tab === 'tests' ? 'active' : ''} onClick={() => setTab('tests')}>
          Testy {result && sum.total > 0 && <span className="count">{sum.total}</span>}
        </button>
        <button className={tab === 'console' ? 'active' : ''} onClick={() => setTab('console')}>
          Konsola {result && result.console.length > 0 && <span className="count">{result.console.length}</span>}
        </button>
        <button className={tab === 'problems' ? 'active' : ''} onClick={() => setTab('problems')}>
          Problemy {problems > 0 && <span className="count bad">{problems}</span>}
        </button>
        <div className="results-summary">
          {running && <span className="spinner">Uruchamianie…</span>}
          {!running && result && sum.total > 0 && (
            <>
              <span className="pass">✓ {sum.passed}</span>
              <span className="fail">✗ {sum.failed}</span>
              {sum.skipped > 0 && <span className="skip">○ {sum.skipped}</span>}
            </>
          )}
          {!running && result && (
            <span className="muted small">
              {result.engine} · {(result.durationMs / 1000).toFixed(1)} s
            </span>
          )}
        </div>
      </div>

      <div className="results-body">
        {!result && !running && <p className="muted placeholder">Uruchom testy przyciskiem ▶ lub skrótem Ctrl+Enter.</p>}

        {result && tab === 'tests' && (
          <>
            {result.errorText && result.kind !== 'compile-error' && <pre className="error-box">{result.errorText}</pre>}
            {result.kind === 'compile-error' && <p className="error-text">Kompilacja nie powiodła się – zobacz zakładkę „Problemy”.</p>}
            {result.kind === 'no-tests' && <p className="muted">Nie znaleziono żadnych testów.</p>}
            {result.kind === 'program' && <p className="muted">Brak testów – uruchomiono program. Wynik w zakładce „Konsola”.</p>}
            {groups.map(([suite, tests]) => (
              <div key={suite} className="suite">
                <div className="suite-name">{suite}</div>
                <ul>
                  {tests.map((t, i) => (
                    <TestRow key={`${t.name}-${i}`} t={t} />
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}

        {result && tab === 'console' && (
          <pre className="console">
            {result.console.length === 0 && <span className="muted">(brak wyjścia)</span>}
            {result.console.map((l, i) => (
              <div key={i} className={`console-line ${l.level}`}>
                {l.text || ' '}
              </div>
            ))}
          </pre>
        )}

        {result && tab === 'problems' && (
          <>
            {result.diagnostics.length === 0 && !result.errorText && <p className="muted">Brak problemów.</p>}
            <ul className="problems">
              {result.diagnostics.map((d, i) => (
                <li key={i}>
                  <button onClick={() => onJump(d)}>
                    <span className="problem-loc">
                      {d.file}:{d.line}:{d.column}
                    </span>
                    <span className="problem-msg">{d.message}</span>
                  </button>
                </li>
              ))}
            </ul>
            {result.errorText && <pre className="error-box">{result.errorText}</pre>}
          </>
        )}
      </div>
    </div>
  );
}
