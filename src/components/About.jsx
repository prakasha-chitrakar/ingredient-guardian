import { ArrowLeft } from 'lucide-react';
import { Brand } from './Nav';

export const CREATORS = ['Prakash Chitrakar', 'Ojaswi Sharma'];
export const CREDIT_LINE = 'Made by Prakash and Ojaswi';

export function Credit() {
  return <p className="credit">{CREDIT_LINE}</p>;
}

export default function About({ onBack }) {
  return (
    <div className="screen">
      <button className="back" onClick={onBack}><ArrowLeft size={18} /> Back</button>
      <Brand />
      <h1 className="h1"><span className="tone-orange">Know</span> what you eat.</h1>
      <p className="lede">Scan any label. Get a plain-language read on what’s inside and what matters for you.</p>

      <section className="group about">
        <h2 className="h3">Created by</h2>
        <ul className="creators">
          {CREATORS.map(name => (
            <li key={name}>
              <span className="creators__avatar" aria-hidden="true">{name.split(' ').map(w => w[0]).join('')}</span>
              {name}
            </li>
          ))}
        </ul>
      </section>

      <section className="group about">
        <h2 className="h3">How it works</h2>
        <ol className="steps">
          <li>Snap or type an ingredient list.</li>
          <li>AI reads each ingredient against your profile.</li>
          <li>Your checks stay on this phone only.</li>
        </ol>
      </section>

      <section className="group about">
        <h2 className="h3">Good to know</h2>
        <p>AI can be wrong. This isn’t medical advice; ask a doctor or pharmacist about anything serious. Food facts on Home come from cited sources such as WHO, FDA and USDA.</p>
      </section>
    </div>
  );
}
