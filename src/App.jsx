import { useEffect, useState } from 'react';
import Landing from './components/Landing';
import Home from './components/Home';
import Scan from './components/Scan';
import Results from './components/Results';
import Profile from './components/Profile';
import Compare from './components/Compare';
import History from './components/History';
import About from './components/About';
import Nav from './components/Nav';
import { load, save } from './lib';

const DEFAULT_PROFILE = { type: 'Adult', allergies: [], medical: [], lifestyle: [] };

export default function App() {
  const [page, setPage] = useState(() => (load('ig.seenIntro', false) ? 'home' : 'landing'));
  const [result, setResult] = useState(null);
  const [scanMode, setScanMode] = useState('photo');
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
    navigator.vibrate?.(30); // a small tap on Android when results arrive
    setResult(r);
    // Keep history light: drop the full-size photo, keep the thumbnail.
    const { preview, ...stored } = r;
    setHistory(prev => [stored, ...prev].slice(0, 20));
    setPage('results');
  };

  const scan = (mode) => {
    setScanMode(mode);
    setPage('scan');
  };

  const clearAll = () => {
    if (!window.confirm('Delete your profile and all checks from this phone? This can’t be undone.')) return;
    setHistory([]);
    setProfile(DEFAULT_PROFILE);
    setResult(null);
    setPage('home');
  };

  const deleteCheck = (index) => setHistory(prev => prev.filter((_, i) => i !== index));
  const restoreCheck = (item, index) => setHistory(prev => [...prev.slice(0, index), item, ...prev.slice(index)]);

  const openFromHistory = (r) => {
    setResult(r);
    setPage('results');
  };

  const ambient = <div className="ambient" aria-hidden="true"><span /><span /><span /></div>;

  if (page === 'landing') {
    return (
      <>
        {ambient}
        <Landing onStart={start} onBarcode={() => { save('ig.seenIntro', true); scan('barcode'); }} />
      </>
    );
  }

  return (
    <>
      {ambient}
      <main>
        {page === 'home' && (
          <Home
            history={history}
            profile={profile}
            onScan={scan}
            onOpen={openFromHistory}
            onSeeAll={() => setPage('history')}
            onCompare={() => setPage('compare')}
            onProfile={() => setPage('profile')}
            onAbout={() => setPage('about')}
          />
        )}
        {page === 'history' && (
          <History
            history={history}
            onOpen={openFromHistory}
            onDelete={deleteCheck}
            onRestore={restoreCheck}
            onClear={() => setHistory([])}
            onBack={() => setPage('home')}
          />
        )}
        {page === 'about' && <About onBack={() => setPage('home')} />}
        {page === 'scan' && <Scan key={scanMode} profile={profile} onResult={handleResult} initialMode={scanMode} />}
        {page === 'compare' && <Compare history={history} onBack={() => setPage('home')} />}
        {page === 'results' && <Results result={result} onScanAgain={() => scan('photo')} onBack={() => setPage('home')} />}
        {page === 'profile' && <Profile profile={profile} onChange={setProfile} onAbout={() => setPage('about')} onClearAll={clearAll} />}
      </main>
      <Nav current={page} onNavigate={setPage} />
    </>
  );
}
