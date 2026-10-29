import { useState } from 'react';
import { ArrowLeft, ChevronDown, CircleCheck, ScanLine, Share2, TriangleAlert } from 'lucide-react';
import FactsPanel from './FactsPanel';
import { STATUS, isFlagged } from '../lib';

const AGE_TONE = { Safe: 'var(--safe)', Caution: 'var(--caution)', Avoid: 'var(--harmful)' };
const AGE_GROUPS = [
  ['infants', 'Babies (0–2)'],
  ['children', 'Children (3–12)'],
  ['adults', 'Adults'],
  ['seniors', 'Older adults (65+)'],
];

function IngredientRow({ ingredient }) {
  const [open, setOpen] = useState(false);
  const status = STATUS[ingredient.status] || STATUS.safe;
  const affectsYou = ['moderate', 'high'].includes(ingredient.userRisk);

  return (
    <li className={`ing${open ? ' is-open' : ''}`}>
      <button className="ing__row" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="dot" style={{ background: status.color }} />
        <span className="ing__text">
          <span className="ing__name">{ingredient.name}</span>
          <span className="ing__meta">
            <span className="ing__status" style={{ color: status.color }}>{status.label}</span>
            {affectsYou && <span className="tag tag--you">Affects you</span>}
          </span>
        </span>
        <ChevronDown size={16} className="ing__chev" />
      </button>

      {open && (
        <div className="ing__detail">
          {ingredient.purpose && <p><b>Used for:</b> {ingredient.purpose}</p>}
          {ingredient.concerns?.length > 0 && (
            <ul className="ing__concerns">
              {ingredient.concerns.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          )}
          {ingredient.tags?.length > 0 && (
            <div className="tags">{ingredient.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
          )}
          {ingredient.ageSuitability && (
            <dl className="age-grid">
              {Object.entries(ingredient.ageSuitability).map(([group, rating]) => (
                <div key={group}>
                  <dt>{group}</dt>
                  <dd style={{ color: AGE_TONE[rating] }}>{rating}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </li>
  );
}

export default function Results({ result, onScanAgain, onBack }) {
  const [tab, setTab] = useState('flagged');
  const [shareNote, setShareNote] = useState('');

  if (!result) {
    return (
      <div className="screen">
        <div className="empty">
          <p className="empty__title">No results yet</p>
          <p>Check a label to see results.</p>
          <button className="btn btn--primary" onClick={onScanAgain}>Check a label</button>
        </div>
      </div>
    );
  }

  const { productName, overallScore, scoreLabel, alerts = [], ingredients = [], ageSummary } = result;
  const flagged = ingredients.filter(isFlagged);
  const list = tab === 'flagged' ? flagged : ingredients;

  const share = async () => {
    const watch = flagged.slice(0, 3).map(i => i.name).join(', ');
    const text = [
      `${productName || 'Product'}: ${overallScore}/100, ${scoreLabel}.`,
      watch && `Watch: ${watch}.`,
      `Checked with Ingredient Guardian: ${window.location.origin}`,
    ].filter(Boolean).join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setShareNote('Copied to clipboard');
        setTimeout(() => setShareNote(''), 2000);
      }
    } catch {
      // Share sheet dismissed; nothing to do.
    }
  };

  return (
    <div className="screen">
      <button className="back" onClick={onBack}><ArrowLeft size={18} /> Home</button>
      {result.preview && <img className="result-photo" src={result.preview} alt="Checked label" />}

      <FactsPanel result={result} />

      {alerts.length > 0 && (
        <ul className="alerts">
          {alerts.map((a, i) => (
            <li key={i} className="alert"><TriangleAlert size={18} /><p>{a}</p></li>
          ))}
        </ul>
      )}

      <div className="seg" role="tablist" aria-label="Ingredient views">
        {[
          ['flagged', `Flagged (${flagged.length})`],
          ['all', `All (${ingredients.length})`],
          ['age', 'By age'],
        ].map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'age' ? (
        <dl className="ages">
          {AGE_GROUPS.filter(([key]) => ageSummary?.[key]).map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{ageSummary[key]}</dd>
            </div>
          ))}
        </dl>
      ) : list.length === 0 ? (
        <div className="all-clear">
          <CircleCheck size={22} />
          {tab === 'flagged' ? 'Nothing flagged for you.' : 'No ingredients found. Try a clearer photo.'}
        </div>
      ) : (
        <ul className="ings">{list.map((ing, i) => <IngredientRow key={`${ing.name}-${i}`} ingredient={ing} />)}</ul>
      )}

      <div className="actions">
        <button className="btn btn--primary" onClick={onScanAgain}><ScanLine size={18} /> Check another</button>
        <button className="btn btn--ghost" onClick={share}><Share2 size={18} /> {shareNote || 'Share'}</button>
      </div>
    </div>
  );
}
