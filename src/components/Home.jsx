import { useMemo, useState } from 'react';
import { ArrowRight, Camera, GitCompareArrows, History, ImageUp, Keyboard, ScanBarcode, UserRound } from 'lucide-react';
import { Brand } from './Nav';
import { Decoder, DiscoveryCard, DiscoverySheet } from './Discovery';
import { CREDIT_LINE } from './About';
import discoveries from '../content/discoveries.json';
import decoder from '../content/decoder.json';
import { isFlagged, rankDiscoveries, scanText, scoreTone, timeAgo } from '../lib';

// Two-tone headlines: [accent, rest].
const HEADLINES = {
  new: [
    ['You know the brand.', ' Do you know what’s inside?'],
    ['Read the label', ' before it reads you.'],
    ['Your snacks', ' have secrets. Let’s hear them.'],
    ['Anything', ' in your cart today?'],
  ],
  returning: [
    ['Did you check', ' the ingredients in your last purchase?'],
    ['Back again.', ' The labels missed you.'],
    ['Your cart', ' called. It has questions.'],
    ['What have you', ' been eating lately? Be honest.'],
    ['Today’s fact', ' might ruin a snack. Sorry.'],
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

export default function Home({ history, profile, onScan, onOpen, onSeeAll, onCompare, onProfile, onAbout }) {
  const stage = history.length === 0 ? 'new' : history.length >= 5 ? 'frequent' : 'returning';
  const [headline] = useState(() => {
    const list = HEADLINES[stage === 'new' ? 'new' : 'returning'];
    return list[Math.floor(Math.random() * list.length)];
  });
  const [offset, setOffset] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const ranked = useMemo(() => rankDiscoveries(discoveries, history, profile), [history, profile]);
  const pick = ranked.length ? ranked[offset % ranked.length] : null;
  const scannedText = useMemo(() => history.slice(0, 10).map(scanText).join(' '), [history]);
  const decoderItems = useMemo(
    () => [...decoder].sort((a, b) => Number(b.matchTerms.some(t => scannedText.includes(t))) - Number(a.matchTerms.some(t => scannedText.includes(t)))),
    [scannedText]
  );
  const recap = stage === 'frequent' ? weeklyRecap(history) : null;
  const hasPreferences = profile.allergies.length || profile.medical.length || profile.lifestyle.length || profile.type !== 'Adult';
  const last = history[0];

  return (
    <div className="screen screen--home">
      <header className="home-top">
        <Brand />
        <button className="glass home-top__who" onClick={onProfile} aria-label="Edit who you’re checking for">
          <UserRound size={16} /> {profile.type}
        </button>
      </header>

      <section className="home-hero">
        <img className="home-hero__img" src="/img/hero-wide.webp" alt="" />
        <div className="glass home-hero__card">
          <h1 className="display-sm"><span className="tone-orange">{headline[0]}</span>{headline[1]}</h1>
          <p className="home-hero__lede">
            {stage === 'new'
              ? 'Scan a packet. We’ll tell you what it isn’t telling you.'
              : `Last checked: ${last.productName || 'a product'}, ${timeAgo(last.scannedAt)}.`}
          </p>
          <button className="btn btn--primary btn--block btn--big" onClick={() => onScan('photo')}>
            <Camera size={20} /> Scan a product
          </button>
          <div className="modes" role="group" aria-label="Other ways to check">
            <button onClick={() => onScan('photo')}><ImageUp size={18} />Photo</button>
            <button onClick={() => onScan('barcode')}><ScanBarcode size={18} />Barcode</button>
            <button onClick={() => onScan('text')}><Keyboard size={18} />Type</button>
          </div>
        </div>
      </section>

      {pick && (
        <DiscoveryCard
          pick={pick}
          onOpen={() => setSheetOpen(true)}
          onNext={() => setOffset(o => o + 1)}
        />
      )}

      {history.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="h2">Remember these?</h2>
            <button className="link" onClick={onSeeAll}>See all</button>
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

      {history.length > 0 && (
        <div className="tiles">
          <button className="tile tile--pink" onClick={onSeeAll}>
            <History size={22} />
            <b>Your checks</b>
            <span>{history.length} saved · search</span>
          </button>
          <button className="tile tile--blue" onClick={onCompare} disabled={history.length < 2}>
            <GitCompareArrows size={22} />
            <b>Compare</b>
            <span>{history.length < 2 ? 'Needs 2 checks' : 'Side by side'}</span>
          </button>
        </div>
      )}

      <section>
        <h2 className="h2 section-title">Ingredient decoder</h2>
        <Decoder items={decoderItems} scannedText={scannedText} />
      </section>

      <button className="credit credit--link" onClick={onAbout}>
        {CREDIT_LINE}
      </button>

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
