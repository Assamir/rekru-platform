import { lazy, Suspense, useEffect, useState } from 'react';
import { Home } from './components/Home';
import { readPayloadFromHash } from './lib/share';

// Edytor (Monaco) ładujemy dopiero na stronie kandydata.
const Workspace = lazy(() => import('./components/Workspace'));

export function App() {
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const onChange = () => setHash(location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const link = readPayloadFromHash(hash);
  if (!link) return <Home />;
  return (
    <Suspense fallback={<div className="loading">Ładowanie edytora…</div>}>
      <Workspace key={link.payload} payload={link.payload} accessCode={link.accessCode} />
    </Suspense>
  );
}
