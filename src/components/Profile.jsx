import { Check, ChevronRight } from 'lucide-react';
import { Credit } from './About';

const TYPES = ['Adult', 'Child', 'Baby', 'Pregnant', 'Elderly'];
const GROUPS = [
  { field: 'allergies', title: 'Allergies', options: ['Nuts', 'Dairy', 'Soy', 'Gluten', 'Shellfish', 'Egg', 'Sesame', 'Fish'] },
  { field: 'medical', title: 'Health conditions', options: ['Diabetes', 'High Blood Pressure', 'Kidney Disease', 'Liver Disease', 'Heart Disease'] },
  { field: 'lifestyle', title: 'Diet and lifestyle', options: ['Vegan', 'Vegetarian', 'Halal', 'Kosher', 'Organic Only'] },
];

function Chip({ label, active, onClick }) {
  return (
    <button className={`chip${active ? ' is-active' : ''}`} aria-pressed={active} onClick={onClick}>
      {active && <Check size={14} strokeWidth={2.6} />}
      {label}
    </button>
  );
}

export default function Profile({ profile, onChange, onAbout }) {
  const toggle = (field, value) => {
    const list = profile[field] || [];
    onChange({ ...profile, [field]: list.includes(value) ? list.filter(x => x !== value) : [...list, value] });
  };

  return (
    <div className="screen">
      <h1 className="h1"><span className="tone-green">Personalise</span> your checks</h1>
      <p className="lede">Saved on this phone.</p>

      <section className="group">
        <h2 className="h3">Who are you checking for?</h2>
        <div className="chips">
          {TYPES.map(t => <Chip key={t} label={t} active={profile.type === t} onClick={() => onChange({ ...profile, type: t })} />)}
        </div>
      </section>

      {GROUPS.map(({ field, title, options }) => (
        <section key={field} className="group">
          <h2 className="h3">{title}</h2>
          <div className="chips">
            {options.map(o => <Chip key={o} label={o} active={profile[field]?.includes(o)} onClick={() => toggle(field, o)} />)}
          </div>
        </section>
      ))}

      <button className="nudge" onClick={onAbout}>
        <span><b>About this app</b></span>
        <ChevronRight size={18} />
      </button>
      <Credit />
    </div>
  );
}
