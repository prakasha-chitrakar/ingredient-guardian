import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, History, GitCompareArrows, Keyboard, Lightbulb, ScanBarcode, Camera } from 'lucide-react';
import FactsPanel from './FactsPanel';

const TYPES = ['Adult', 'Child', 'Baby', 'Pregnant', 'Elderly'];
const ALLERGIES = ['Nuts', 'Dairy', 'Soy', 'Gluten', 'Shellfish', 'Egg', 'Sesame', 'Fish'];

const EXAMPLE = {
  productName: 'Mango drink',
  productType: 'Beverage',
  overallScore: 46,
  scoreLabel: 'Moderate Risk',
  counts: { safe: 3, caution: 1, harmful: 1 },
};

function Chip({ label, active, onClick }) {
  return (
    <button className={`chip${active ? ' is-active' : ''}`} aria-pressed={active} onClick={onClick}>
      {active && <Check size={14} strokeWidth={2.6} />}
      {label}
    </button>
  );
}

// First-run walkthrough: four short steps, swipeable, skippable, replayable from Profile.
export default function Onboarding({ profile, onProfileChange, onDone }) {
  const [step, setStep] = useState(0);
  const startX = useRef(null);

  const toggleAllergy = (a) => {
    const list = profile.allergies || [];
    onProfileChange({ ...profile, allergies: list.includes(a) ? list.filter(x => x !== a) : [...list, a] });
  };

  const steps = [
    {
      kicker: 'Step 1',
      title: <>Choose how to <span className="tone-orange">check it.</span></>,
      body: (
        <ul className="ob-ways">
          <li><span className="ob-ways__icon"><Camera size={20} /></span><div><b>Photo</b><span>Snap the ingredients on the back.</span></div></li>
          <li><span className="ob-ways__icon"><ScanBarcode size={20} /></span><div><b>Barcode</b><span>Scan the barcode. We’ll find the ingredients.</span></div></li>
          <li><span className="ob-ways__icon"><Keyboard size={20} /></span><div><b>Type</b><span>Paste or type the list.</span></div></li>
        </ul>
      ),
    },
    {
      kicker: 'Step 2',
      title: <>Tell us a little <span className="tone-orange">about you.</span></>,
      body: (
        <div className="ob-profile">
          <p className="ob-label">Who are you checking for?</p>
          <div className="chips">
            {TYPES.map(t => <Chip key={t} label={t} active={profile.type === t} onClick={() => onProfileChange({ ...profile, type: t })} />)}
          </div>
          <p className="ob-label">Any allergies to flag?</p>
          <div className="chips">
            {ALLERGIES.map(a => <Chip key={a} label={a} active={profile.allergies?.includes(a)} onClick={() => toggleAllergy(a)} />)}
          </div>
          <p className="ob-note">Optional. Edit anytime. Your info stays on your phone.</p>
        </div>
      ),
    },
    {
      kicker: 'Step 3',
      title: <>Get your <span className="tone-orange">verdict.</span></>,
      body: (
        <div className="ob-verdict">
          <div className="ob-verdict__panel"><FactsPanel result={EXAMPLE} example /></div>
          <ul className="ob-tips">
            <li><ChevronDown size={18} /> Tap an ingredient to see why it’s flagged.</li>
            <li><ArrowRight size={18} /> Check the sources. Make up your own mind.</li>
          </ul>
        </div>
      ),
    },
    {
      kicker: 'Step 4',
      title: <>Pick up facts <span className="tone-orange">as you go.</span></>,
      body: (
        <ul className="ob-ways">
          <li><span className="ob-ways__icon ob-ways__icon--pink"><Lightbulb size={20} /></span><div><b>Daily facts</b><span>Facts picked for your scans, with sources.</span></div></li>
          <li><span className="ob-ways__icon ob-ways__icon--blue"><History size={20} /></span><div><b>Your checks</b><span>Saved on your phone. Find them anytime.</span></div></li>
          <li><span className="ob-ways__icon ob-ways__icon--pine"><GitCompareArrows size={20} /></span><div><b>Compare</b><span>Compare two products, side by side.</span></div></li>
        </ul>
      ),
    },
  ];

  const last = step === steps.length - 1;
  const next = () => (last ? onDone() : setStep(s => s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  // Swipe left/right between steps.
  const onPointerDown = (e) => { startX.current = e.clientX; };
  const onPointerUp = (e) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (dx < -50 && !last) setStep(s => s + 1);
    if (dx > 50) back();
  };

  const s = steps[step];

  return (
    <div className="onboarding" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <header className="onboarding__top">
        <img src="/logo.svg" alt="" width="32" height="32" />
        <button className="link" onClick={onDone}>Skip</button>
      </header>

      <div className="onboarding__dots" aria-hidden="true">
        {steps.map((_, i) => <span key={i} className={i === step ? 'is-active' : i < step ? 'is-done' : ''} />)}
      </div>

      <section className="onboarding__step" key={step} aria-live="polite">
        <p className="kicker">{s.kicker} of {steps.length}</p>
        <h1 className="h1 onboarding__title">{s.title}</h1>
        {s.body}
      </section>

      <footer className="onboarding__nav">
        {step > 0
          ? <button className="btn btn--ghost" onClick={back} aria-label="Back"><ArrowLeft size={18} /></button>
          : <span />}
        <button className="btn btn--primary btn--big" onClick={next}>
          {last ? 'Let’s check' : 'Next'} <ArrowRight size={18} />
        </button>
      </footer>
    </div>
  );
}
