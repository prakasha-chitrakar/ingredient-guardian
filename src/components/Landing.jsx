import { ArrowRight, ScanBarcode } from 'lucide-react';
import FactsPanel from './FactsPanel';
import { Brand } from './Nav';
import { Credit } from './About';

const EXAMPLE = {
  productName: 'Plain Greek yogurt',
  productType: 'Food',
  overallScore: 82,
  scoreLabel: 'Good',
  summary: 'Clean and simple. Contains milk.',
  counts: { safe: 4, caution: 1, allergen: 1 },
};

const WAYS = [
  { img: '/img/label.webp', title: 'Snap the ingredients', text: 'Any label, any language on the pack.' },
  { img: '/img/barcode.webp', title: 'Scan the barcode', text: 'We look it up for you.' },
  { img: '/img/beauty.webp', title: 'Food, skin & hair', text: 'Snacks, shampoo, supplements and more.' },
];

export default function Landing({ onStart, onBarcode }) {
  return (
    <div className="landing">
      <section className="landing__hero">
        <img className="landing__hero-img" src="/img/hero.webp" alt="" fetchpriority="high" />
        <div className="landing__hero-top">
          <div className="glass landing__pill"><Brand /></div>
        </div>
        <div className="glass landing__hero-card">
          <h1 className="landing__title">
            Read the label <span className="tone-orange">before it reads you.</span>
          </h1>
          <p className="landing__lede">Snap any packet. Find out what it’s hiding, and what it means for you.</p>
          <div className="landing__ctas">
            <button className="btn btn--primary btn--big" onClick={onStart}>Check a label <ArrowRight size={18} /></button>
            <button className="btn btn--glass btn--big" onClick={onBarcode}><ScanBarcode size={18} /> Barcode</button>
          </div>
        </div>
      </section>

      <div className="landing__body">
        <section>
          <p className="kicker">Three ways in</p>
          <h2 className="landing__h2">However the label <span className="serif">shows up.</span></h2>
          <ul className="ways">
            {WAYS.map(w => (
              <li key={w.title} className="way">
                <img src={w.img} alt="" loading="lazy" />
                <div className="glass way__caption">
                  <b>{w.title}</b>
                  <span>{w.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="landing__example">
          <p className="kicker">What you get</p>
          <h2 className="landing__h2">A verdict, <span className="serif">not a lecture.</span></h2>
          <div className="landing__example-frame">
            <FactsPanel result={EXAMPLE} example />
          </div>
        </section>

        <section className="landing__personal">
          <p className="kicker">Made for you</p>
          <h2 className="landing__h2">Your allergies. <span className="serif">Your rules.</span></h2>
          <ul className="landing__chips">
            {['Nut allergy', 'Diabetes', 'Pregnant', 'Vegan', 'Checking for a baby', 'Gluten-free'].map(c => <li key={c}>{c}</li>)}
          </ul>
          <p className="landing__small">Every check is judged against your profile. It all stays on your phone.</p>
        </section>

        <section className="landing__final glass">
          <h2 className="landing__h2">Your snacks <span className="serif">have secrets.</span></h2>
          <button className="btn btn--primary btn--block btn--big" onClick={onStart}>Check a label <ArrowRight size={18} /></button>
          <p className="note">AI can be wrong. Not medical advice.</p>
        </section>

        <Credit />
      </div>
    </div>
  );
}
