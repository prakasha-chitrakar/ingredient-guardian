import { useEffect, useState } from 'react';
import Landing from './components/Landing';
import Home from './components/Home';
import Scan from './components/Scan';
import Results from './components/Results';
import Profile from './components/Profile';
import Nav from './components/Nav';
import { load, save } from './lib';

const DEFAULT_PROFILE = { type: 'Adult', allergies: [], medical: [], lifestyle: [] };

export default function App() {
  const [page, setPage] = useState(() => (load('ig.seenIntro', false) ? 'home' : 'landing'));
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState(() => load('ig.history', []));
  const [profile, setProfile] = useState(() => ({ ...DEFAULT_PROFILE, ...load('ig.profile', {}) }));

  useEffect(() => { save('ig.history', history); }, [history]);
  useEffect(() => { save('ig.profile', profile); }, [profile]);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  const start = () => {
    save('ig.seenIntro', true);
    setPage('scan');
  };

  const handleResult = (r) => {
    setResult(r);
    // Keep history light: drop the full-size photo, keep the thumbnail.
    const { preview, ...stored } = r;
    setHistory(prev => [stored, ...prev].slice(0, 20));
    setPage('results');
  };

  const openFromHistory = (r) => {
    setResult(r);
    setPage('results');
  };

  if (page === 'landing') return <Landing onStart={start} />;

  return (
    <>
      <main>
        {page === 'home' && <Home history={history} onScan={() => setPage('scan')} onOpen={openFromHistory} onClear={() => setHistory([])} />}
        {page === 'scan' && <Scan profile={profile} onResult={handleResult} />}
        {page === 'results' && <Results result={result} onScanAgain={() => setPage('scan')} />}
        {page === 'profile' && <Profile profile={profile} onChange={setProfile} />}
      </main>
      <Nav current={page} onNavigate={setPage} />
    </>
  );
}
