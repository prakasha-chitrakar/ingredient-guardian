import { ArrowRight, ChevronRight } from 'lucide-react';
import { Brand } from './Nav';
import { countStatuses, scoreTone, timeAgo } from '../lib';

export default function Home({ history, onScan, onOpen, onClear }) {
  const avg = history.length
    ? Math.round(history.reduce((s, r) => s + (Number(r.overallScore) || 0), 0) / history.length)
    : null;
  const flagged = history.reduce((n, r) => {
    const c = countStatuses(r);
    return n + (c.harmful || 0) + (c.carcinogen || 0);
  }, 0);

  const clear = () => {
    if (window.confirm('Clear all checks?')) onClear();
  };

  return (
    <div className="screen">
      <Brand />

      <h1 className="h1"><span className="tone-orange">Know</span> what’s in your basket.</h1>

      <button className="btn btn--primary btn--block" onClick={onScan}>
        Check a label <ArrowRight size={18} />
      </button>

      {history.length > 0 && (
        <dl className="stats">
          <div><dt>Checks</dt><dd>{history.length}</dd></div>
          <div><dt>Average</dt><dd style={{ color: scoreTone(avg) }}>{avg}</dd></div>
          <div><dt>Risky found</dt><dd style={{ color: flagged ? 'var(--harmful)' : undefined }}>{flagged}</dd></div>
        </dl>
      )}

      <section>
        <div className="section-head">
          <h2 className="h2">Recent checks</h2>
          {history.length > 0 && <button className="link" onClick={clear}>Clear</button>}
        </div>

        {history.length === 0 ? (
          <div className="empty">
            <p className="empty__title">No checks yet</p>
            <p>They’ll show up here.</p>
          </div>
        ) : (
          <ul className="list">
            {history.map((r, i) => (
              <li key={r.scannedAt || i}>
                <button className="list__row" onClick={() => onOpen(r)}>
                  {r.thumb
                    ? <img className="list__thumb" src={r.thumb} alt="" />
                    : <span className="list__score" style={{ color: scoreTone(r.overallScore), borderColor: scoreTone(r.overallScore) }}>{r.overallScore}</span>}
                  <span className="list__text">
                    <span className="list__name">{r.productName || 'Unnamed product'}</span>
                    <span className="list__meta">
                      <b style={{ color: scoreTone(r.overallScore) }}>{r.overallScore} · {r.scoreLabel}</b>
                      {r.scannedAt && ` · ${timeAgo(r.scannedAt)}`}
                    </span>
                  </span>
                  <ChevronRight size={18} className="list__chev" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
