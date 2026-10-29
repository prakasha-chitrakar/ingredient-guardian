import { STATUS, STATUS_ORDER, countStatuses, scoreTone } from '../lib';

export function ScoreRing({ score, size = 104 }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  const tone = scoreTone(value);

  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`Safety score ${value} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring__track" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          className="ring__value" strokeWidth={stroke}
          stroke={tone}
          strokeDasharray={circ}
          strokeDashoffset={circ - (value / 100) * circ}
          style={{ '--circ': circ }}
        />
      </svg>
      <span className="ring__number" style={{ color: tone }}>
        {value}
        <small>of 100</small>
      </span>
    </div>
  );
}

// Summary card for one checked product: verdict, score ring and a count per status.
export default function FactsPanel({ result, example = false }) {
  const { productName, productType, overallScore, scoreLabel, summary } = result;
  const counts = countStatuses(result);

  return (
    <section className="facts" aria-label="Safety summary">
      <div className="facts__top">
        <div>
          <p className="facts__eyebrow">{[productType, example && 'Example'].filter(Boolean).join(' · ')}</p>
          <h2 className="facts__name">{productName || 'Unnamed product'}</h2>
          <p className="facts__verdict" style={{ color: scoreTone(overallScore) }}>{scoreLabel}</p>
        </div>
        <ScoreRing score={overallScore} />
      </div>

      <ul className="facts__counts">
        {STATUS_ORDER.map(s => (
          <li key={s} className={`facts__row${counts[s] ? '' : ' is-zero'}`}>
            <span className="facts__status">
              <span className="dot" style={{ background: STATUS[s].color }} />
              {STATUS[s].label}
            </span>
            <b style={{ color: STATUS[s].color }}>{counts[s] || 0}</b>
          </li>
        ))}
      </ul>

      {summary && <p className="facts__summary">{summary}</p>}
    </section>
  );
}
