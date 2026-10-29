import { useMemo, useState } from 'react';
import { ArrowRight, Camera } from 'lucide-react';
import { Brand } from './Nav';
import { Decoder, DiscoveryCard, DiscoverySheet } from './Discovery';
import discoveries from '../content/discoveries.json';
import decoder from '../content/decoder.json';
import { isFlagged, pickDiscovery, scanText, scoreTone, timeAgo } from '../lib';

// Two-tone headlines: [accent, rest].
const HEADLINES = {
  new: [
    ['You know the brand.', ' Do you know what’s inside?'],
    ['Anything', ' in your cart today?'],
    ['Before your next bite,', ' learn something new.'],
  ],
  returning: [
    ['Did you check', ' the ingredients in your last purchase?'],
    ['What have you', ' been eating lately?'],
    ['Anything new', ' in your shopping basket?'],
    ['Today’s food fact', ' might surprise you.'],
  ],
};

const WEEK = 7 * 86_400_000;

function weeklyRecap(history) {
  const week = history.filter(r => r.scannedAt && Date.now() - new Date(r.scannedAt) < WEEK);
  if (!week.length) return null;
  const tally = {};
  for (const r of week) {
    for (const i of (r.ingredients || []).filter(isFlagged)) tally[i.name] = (tally[i.name] || 0) + 1;
  }
  const top = Object.entries(tally).sort((x, y) => y[1] - x[1])[0];
  return {
    count: week.length,
    flagged: Object.values(tally).reduce((a, b) => a + b, 0),
    top: top && top[1] > 1 ? top[0] : null,
  };
}

export default function Home({ history, profile, onScan, onOpen, onClear, onCompare, onProfile }) {
  const stage = history.length === 0 ? 'new' : history.length >= 5 ? 'frequent' : 'returning';
  const [headline] = useState(() => {
    const list = HEADLINES[stage === 'new' ? 'new' : 'returning'];
    return list[Math.floor(Math.random() * list.length)];
  });
  const [offset, setOffset] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const pick = useMemo(() => pickDiscovery(discoveries, history, profile, offset), [history, profile, offset]);
  const scannedText = useMemo(() => history.slice(0, 10).map(scanText).join(' '), [history]);
  const decoderItems = useMemo(
    () => [...decoder].sort((a, b) => Number(b.matchTerms.some(t => scannedText.includes(t))) - Number(a.matchTerms.some(t => scannedText.includes(t)))),
    [scannedText]
  );
  const recap = stage === 'frequent' ? weeklyRecap(history) : null;
  const hasPreferences = profile.allergies.length || profile.medical.length || profile.lifestyle.length || profile.type !== 'Adult';
  const last = history[0];

  const clear = () => {
    if (window.confirm('Clear all checks?')) onClear();
  };

  return (
    <div className="screen screen--home">
      <Brand />

      <section className="hero">
        <h1 className="display-sm"><span className="tone-green">{headline[0]}</span>{headline[1]}</h1>
        <p className="lede">
          {stage === 'new'
            ? 'Scan a packet or its ingredient list. We’ll explain what’s inside.'
            : `Last checked: ${last.productName || 'a product'}, ${timeAgo(last.scannedAt)}.`}
        </p>
        <button className="btn btn--primary btn--block btn--big" onClick={() => onScan('photo')}>
          <Camera size={20} /> Scan a product
        </button>
        <button className="link hero__alt" onClick={() => onScan('text')}>Or type the ingredients</button>
      </section>

      {pick && (
        <DiscoveryCard
          item={pick.item}
          linkedScan={pick.scan}
          onOpen={() => setSheetOpen(true)}
        />
      )}

      {history.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="h2">Remember these?</h2>
            <button className="link" onClick={clear}>Clear</button>
          </div>
          <ul className="shelf">
            {history.slice(0, 10).map((r, i) => {
              const flagged = (r.ingredients || []).filter(isFlagged).length;
              return (
                <li key={r.scannedAt || i}>
                  <button className="shelf__card" onClick={() => onOpen(r)}>
                    {r.thumb
                      ? <img className="shelf__thumb" src={r.thumb} alt="" />
                      : <span className="shelf__score" style={{ color: scoreTone(r.overallScore) }}>{r.overallScore}</span>}
                    <span className="shelf__name">{r.productName || 'Unnamed product'}</span>
                    <span className="shelf__meta">{flagged ? `${flagged} flagged` : 'Nothing flagged'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {history.length > 0 && !hasPreferences && (
        <button className="nudge" onClick={onProfile}>
          <span><b>Get personal alerts.</b> Add allergies or diet to your profile.</span>
          <ArrowRight size={18} />
        </button>
      )}

      {recap && (
        <section className="recap">
          <p className="eyebrow">This week</p>
          <p className="recap__line">
            <b>{recap.count}</b> {recap.count === 1 ? 'product' : 'products'} checked, <b>{recap.flagged}</b> flagged {recap.flagged === 1 ? 'ingredient' : 'ingredients'}.
          </p>
          {recap.top && <p className="recap__top">Came up most: {recap.top}</p>}
        </section>
      )}

      {history.length >= 2 && (
        <button className="nudge" onClick={onCompare}>
          <span><b>Compare two products.</b> See the differences side by side.</span>
          <ArrowRight size={18} />
        </button>
      )}

      <section>
        <h2 className="h2 section-title">Ingredient decoder</h2>
        <Decoder items={decoderItems} scannedText={scannedText} />
      </section>

      {sheetOpen && pick && (
        <DiscoverySheet
          item={pick.item}
          onClose={() => setSheetOpen(false)}
          onNext={() => setOffset(o => o + 1)}
          onScan={() => { setSheetOpen(false); onScan('photo'); }}
        />
      )}
    </div>
  );
}
