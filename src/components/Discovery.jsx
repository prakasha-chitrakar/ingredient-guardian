import { useEffect, useRef } from 'react';
import { ArrowRight, RefreshCw, X } from 'lucide-react';
import Illustration from './Illustrations';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const TEASERS = ['Did you know?', 'Plot twist', 'Brace yourself', 'Small print, big news'];

function eyebrowFor({ reason, scan, typeName, item }) {
  if (reason === 'scan') return `About your ${scan.productName || 'last scan'}`;
  if (reason === 'category') return `For your ${typeName.toLowerCase()} habit`;
  return TEASERS[item.id.length % TEASERS.length];
}

// A fact on Home. `pick` comes from rankDiscoveries and says why it was chosen.
export function DiscoveryCard({ pick, onOpen, onNext }) {
  const { item } = pick;
  return (
    <article className="discovery" key={item.id}>
      <Illustration name={item.visual} className="discovery__art" />
      <div className="discovery__body">
        <p className="eyebrow">
          {eyebrowFor(pick)}
          <span className="discovery__cat">{item.category}</span>
        </p>
        <h2 className="discovery__headline">{item.headline}</h2>
        <p className="discovery__text">{item.explanation}</p>
        <div className="discovery__actions">
          <button className="link link--arrow" onClick={onOpen}>Discover more <ArrowRight size={16} /></button>
          <button className="discovery__next" onClick={onNext} aria-label="Show another fact">
            <RefreshCw size={16} /> Another fact
          </button>
        </div>
      </div>
    </article>
  );
}

export function DiscoverySheet({ item, onClose, onNext, onScan }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" onClick={e => e.stopPropagation()}>
        <button ref={closeRef} className="sheet__close" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <Illustration name={item.visual} className="sheet__art" />

        <div className="sheet__body">
          <p className="eyebrow">{item.category} · {item.product}</p>
          <h2 id="sheet-title" className="h2">{item.headline}</h2>
          <p>{item.explanation}</p>

          {item.howTo?.length > 0 && (
            <section>
              <h3 className="h3">Check it on your label</h3>
              <ol className="steps">{item.howTo.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </section>
          )}

          {item.note && <p className="sheet__note">{item.note}</p>}

          <section>
            <h3 className="h3">Sources</h3>
            <ul className="sources">
              {item.sources.map(s => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a><span>{s.publisher}</span></li>
              ))}
            </ul>
            <p className="sources__date">Checked {formatDate(item.verified)}</p>
          </section>

          <div className="actions">
            <button className="btn btn--primary" onClick={onScan}>Scan now</button>
            <button className="btn btn--ghost" onClick={onNext}>Next fact</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Plain-language explainers for common unfamiliar ingredients.
export function Decoder({ items, scannedText }) {
  return (
    <ul className="decoder">
      {items.map(item => {
        const seen = scannedText && item.matchTerms.some(t => scannedText.includes(t));
        return (
          <li key={item.id}>
            <details>
              <summary>
                <span>{item.question}</span>
                {seen && <span className="tag tag--seen">In your scans</span>}
              </summary>
              <dl className="decoder__body">
                <div><dt>What it does</dt><dd>{item.function}</dd></div>
                <div><dt>Health</dt><dd>{item.health}</dd></div>
              </dl>
              <p className="decoder__source">
                Source: {item.sources.map((s, i) => (
                  <span key={s.url}>{i > 0 && ', '}<a href={s.url} target="_blank" rel="noreferrer">{s.publisher}</a></span>
                ))}
              </p>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
