import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { STATUS, isFlagged } from '../lib';

const norm = (s) => s.toLowerCase().replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim();

function names(product) {
  return new Map((product.ingredients || []).map(i => [norm(i.name), i]));
}

function IngredientList({ list, empty }) {
  if (!list.length) return <p className="compare__empty">{empty}</p>;
  return (
    <ul className="compare__list">
      {list.map(i => (
        <li key={i.name}>
          <span className="dot" style={{ background: (STATUS[i.status] || STATUS.safe).color }} />
          {i.name}
        </li>
      ))}
    </ul>
  );
}

// Side-by-side differences between two saved scans. No winner, no combined score.
export default function Compare({ history, onBack }) {
  const label = (r) => r.productName || 'Unnamed product';
  const [a, setA] = useState(0);
  const [b, setB] = useState(Math.min(1, history.length - 1));

  if (history.length < 2) {
    return (
      <div className="screen">
        <button className="back" onClick={onBack}><ArrowLeft size={18} /> Home</button>
        <div className="empty">
          <p className="empty__title">Check two products first</p>
          <p>Then compare them here.</p>
        </div>
      </div>
    );
  }

  const A = history[a];
  const B = history[b];
  const mapA = names(A);
  const mapB = names(B);
  const shared = [...mapA.keys()].filter(k => mapB.has(k)).map(k => mapA.get(k));
  const onlyA = [...mapA.keys()].filter(k => !mapB.has(k)).map(k => mapA.get(k));
  const onlyB = [...mapB.keys()].filter(k => !mapA.has(k)).map(k => mapB.get(k));

  const column = (p) => {
    const ings = p.ingredients || [];
    return {
      count: ings.length,
      flagged: ings.filter(isFlagged),
      forYou: ings.filter(i => ['moderate', 'high'].includes(i.userRisk)),
    };
  };
  const ca = column(A);
  const cb = column(B);

  return (
    <div className="screen">
      <button className="back" onClick={onBack}><ArrowLeft size={18} /> Home</button>
      <h1 className="h1"><span className="tone-orange">Compare</span> two products</h1>

      <div className="field-row">
        {[[a, setA, 'First'], [b, setB, 'Second']].map(([value, set, name]) => (
          <label key={name} className="field">
            <span className="label">{name}</span>
            <select className="input" value={value} onChange={e => set(Number(e.target.value))}>
              {history.map((r, i) => <option key={i} value={i}>{label(r)}</option>)}
            </select>
          </label>
        ))}
      </div>

      <section className="compare">
        <div className="compare__row compare__row--head">
          <span />
          <b>{A.productName || 'First'}</b>
          <b>{B.productName || 'Second'}</b>
        </div>
        <div className="compare__row"><span>Type</span><span>{A.productType || '—'}</span><span>{B.productType || '—'}</span></div>
        <div className="compare__row"><span>Ingredients</span><span>{ca.count}</span><span>{cb.count}</span></div>
        <div className="compare__row"><span>Flagged</span><span>{ca.flagged.length}</span><span>{cb.flagged.length}</span></div>
        <div className="compare__row"><span>Relevant to you</span><span>{ca.forYou.length}</span><span>{cb.forYou.length}</span></div>
      </section>

      <section className="compare__cols">
        <div>
          <h2 className="h3">Flagged in {A.productName || 'first'}</h2>
          <IngredientList list={ca.flagged} empty="Nothing flagged." />
        </div>
        <div>
          <h2 className="h3">Flagged in {B.productName || 'second'}</h2>
          <IngredientList list={cb.flagged} empty="Nothing flagged." />
        </div>
      </section>

      <section className="compare__cols">
        <div>
          <h2 className="h3">Only in {A.productName || 'first'}</h2>
          <IngredientList list={onlyA} empty="None" />
        </div>
        <div>
          <h2 className="h3">Only in {B.productName || 'second'}</h2>
          <IngredientList list={onlyB} empty="None" />
        </div>
      </section>

      <section>
        <h2 className="h3">In both</h2>
        <IngredientList list={shared} empty="No shared ingredients." />
      </section>

      <p className="note">Just the differences. The better pick depends on you.</p>
    </div>
  );
}
