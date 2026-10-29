import { ArrowRight } from 'lucide-react';
import FactsPanel from './FactsPanel';
import { Brand } from './Nav';

const EXAMPLE = {
  productName: 'Plain Greek yogurt',
  productType: 'Food',
  overallScore: 82,
  scoreLabel: 'Good',
  summary: 'Clean and simple. Contains milk.',
  counts: { safe: 4, caution: 1, allergen: 1 },
};

export default function Landing({ onStart }) {
  return (
    <div className="screen landing">
      <Brand />

      <h1 className="display"><span className="tone-green">Eat safer.</span> Check the label first.</h1>
      <p className="lede">Snap a label. See what’s safe for you.</p>

      <FactsPanel result={EXAMPLE} example />

      <button className="btn btn--primary btn--block" onClick={onStart}>
        Check a label <ArrowRight size={18} />
      </button>
      <p className="note">AI can be wrong. Not medical advice.</p>
    </div>
  );
}
