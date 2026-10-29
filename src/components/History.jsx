import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, Trash2 } from 'lucide-react';
import { isFlagged, scanText, scoreTone, timeAgo } from '../lib';

// All saved checks: search by product or ingredient, open, or delete with undo.
export default function History({ history, onOpen, onDelete, onRestore, onClear, onBack }) {
  const [query, setQuery] = useState('');
  const [undo, setUndo] = useState(null); // { item, index }

  useEffect(() => {
    if (!undo) return;
    const id = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(id);
  }, [undo]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return history.map((item, index) => ({ item, index })).filter(({ item }) => !q || scanText(item).includes(q));
  }, [history, query]);

  const remove = (item, index) => {
    onDelete(index);
    setUndo({ item, index });
  };

  const clear = () => {
    if (window.confirm('Clear all checks?')) onClear();
  };

  return (
    <div className="screen">
      <button className="back" onClick={onBack}><ArrowLeft size={18} /> Home</button>
      <div className="section-head">
        <h1 className="h1"><span className="tone-orange">Your</span> checks</h1>
        {history.length > 0 && <button className="link" onClick={clear}>Clear all</button>}
      </div>

      {history.length > 0 && (
        <label className="search">
          <Search size={18} aria-hidden="true" />
          <input
            className="search__input"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products or ingredients"
            aria-label="Search your checks"
          />
        </label>
      )}

      {history.length === 0 ? (
        <div className="empty">
          <p className="empty__title">No checks yet</p>
          <p>Nothing to see here. Scan your first product.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <p className="empty__title">No matches</p>
          <p>No results for that name. Try another.</p>
        </div>
      ) : (
        <ul className="list">
          {shown.map(({ item, index }) => {
            const flagged = (item.ingredients || []).filter(isFlagged).length;
            return (
              <li key={item.scannedAt || index} className="list__item">
                <button className="list__row" onClick={() => onOpen(item)}>
                  {item.thumb
                    ? <img className="list__thumb" src={item.thumb} alt="" />
                    : <span className="list__score" style={{ color: scoreTone(item.overallScore), borderColor: scoreTone(item.overallScore) }}>{item.overallScore}</span>}
                  <span className="list__text">
                    <span className="list__name">{item.productName || 'Unnamed product'}</span>
                    <span className="list__meta">
                      {flagged ? `${flagged} flagged` : 'Nothing flagged'}
                      {item.scannedAt && ` · ${timeAgo(item.scannedAt)}`}
                    </span>
                  </span>
                </button>
                <button className="list__delete" onClick={() => remove(item, index)} aria-label={`Delete ${item.productName || 'check'}`}>
                  <Trash2 size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {undo && (
        <div className="toast" role="status">
          Deleted {undo.item.productName || 'check'}
          <button className="toast__action" onClick={() => { onRestore(undo.item, undo.index); setUndo(null); }}>Undo</button>
        </div>
      )}
    </div>
  );
}
