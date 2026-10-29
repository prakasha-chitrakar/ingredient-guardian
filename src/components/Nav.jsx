import { House, ScanLine, ShieldCheck, UserRound } from 'lucide-react';

export function Brand() {
  return (
    <header className="brand">
      <span className="brand__mark"><ShieldCheck size={19} strokeWidth={2.4} /></span>
      Ingredient Guardian
    </header>
  );
}

export default function Nav({ current, onNavigate }) {
  const tab = (id, label, Icon) => {
    const active = current === id;
    return (
      <button className={`nav__item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => onNavigate(id)}>
        <Icon size={22} strokeWidth={active ? 2.4 : 1.9} />
        {label}
      </button>
    );
  };

  return (
    <nav className="nav" aria-label="Main">
      {tab('home', 'Home', House)}
      <button className="nav__scan" aria-label="Check a label" aria-current={current === 'scan' || current === 'results' ? 'page' : undefined} onClick={() => onNavigate('scan')}>
        <ScanLine size={26} strokeWidth={2.4} />
      </button>
      {tab('profile', 'Profile', UserRound)}
    </nav>
  );
}
