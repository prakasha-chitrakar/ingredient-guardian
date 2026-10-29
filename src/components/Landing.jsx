import { ArrowRight, ScanBarcode } from 'lucide-react';
import FactsPanel from './FactsPanel';
import { Brand } from './Nav';
import { Credit } from './About';

const EXAMPLE = {
  productName: 'Plain Greek yogurt',
  productType: 'Food',
  overallScore: 82,
  scoreLabel: 'Looks good',
  summary: 'Simple ingredients. Contains milk.',
  counts: { safe: 4, caution: 1, allergen: 1 },
};

const WAYS = [
  { img: '/img/label.webp', title: 'Snap the label', text: 'Any language. Any packet.' },
  { img: '/img/barcode.webp', title: 'Scan a barcode', text: 'We’ll find the product.' },
  { img: '/img/beauty.webp', title: 'Food, skin & hair', text: 'From snacks to shampoo.' },
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
            Read the label <span className="tone-orange">before it fools you.</span>
          </h1>
          <p className="landing__lede">Snap a product. Find out what’s inside—and what it means for you.</p>
          <div className="landing__ctas">
            <button className="btn btn--primary btn--big" onClick={onStart}>Check a label <ArrowRight size={18} /></button>
            <button className="btn btn--glass btn--big" onClick={onBarcode}><ScanBarcode size={18} /> Barcode</button>
          </div>
        </div>
      </section>

      <div className="landing__body">
        <section>
          <p className="kicker">Three ways to check</p>
          <h2 className="landing__h2">However the label <span className="serif">finds you.</span></h2>
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
          <p className="kicker">The good stuff</p>
          <h2 className="landing__h2">A clear verdict, <span className="serif">zero lectures.</span></h2>
          <div className="landing__example-frame">
            <FactsPanel result={EXAMPLE} example />
          </div>
        </section>

        <section className="landing__personal">
          <p className="kicker">Made for you</p>
          <h2 className="landing__h2">Your allergies. <span className="serif">Your call.</span></h2>
          <ul className="landing__chips">
            {['Nut allergy', 'Diabetes', 'Pregnant', 'Vegan', 'Checking for a baby', 'Gluten-free'].map(c => <li key={c}>{c}</li>)}
          </ul>
          <p className="landing__small">Checks tailored to you. Your data stays on your phone.</p>
        </section>

        <section className="landing__final glass">
          <h2 className="landing__h2">Your snacks <span className="serif">aren’t telling you everything.</span></h2>
          <button className="btn btn--primary btn--block btn--big" onClick={onStart}>Check a label <ArrowRight size={18} /></button>
          <p className="note">AI can get it wrong. Not medical advice.</p>
        </section>

        <Credit />
      </div>
    </div>
  );
}
