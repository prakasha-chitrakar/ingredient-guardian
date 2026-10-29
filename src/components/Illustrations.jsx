// Flat, drawn visuals for discovery cards. No brand marks or product photos.

// Backdrops use the brand palette: Mandys Pink, Botticelli and Pine Glade.
const BG = {
  can: '#efb6a2',
  noodles: '#bcc590',
  chips: '#c5d7e3',
  apple: '#c5d7e3',
  bread: '#efb6a2',
  carton: '#bcc590',
  bottle: '#c5d7e3',
  tube: '#efb6a2',
  dryer: '#bcc590',
  pills: '#efb6a2',
};

function Can() {
  return (
    <g>
      <rect x="70" y="30" width="64" height="112" rx="10" fill="#ff3400" />
      <rect x="70" y="30" width="64" height="12" rx="6" fill="#d9d9d9" />
      <rect x="70" y="130" width="64" height="12" rx="6" fill="#d9d9d9" />
      <path d="M70 88 C 90 74, 114 102, 134 86" stroke="#fff" strokeWidth="6" fill="none" strokeLinecap="round" />
      {[0, 1, 2].map(i => (
        <rect key={i} x="152" y={120 - i * 24} width="22" height="22" rx="4" fill="#fff" stroke="#2f2f2f" strokeWidth="2" />
      ))}
    </g>
  );
}

function Noodles() {
  return (
    <g>
      <path d="M50 92 H170 A60 60 0 0 1 50 92 Z" fill="#ff6d00" />
      {[0, 1, 2, 3].map(i => (
        <path key={i} d={`M${72 + i * 22} 92 q 6 -16 0 -30 q -6 -14 0 -28`} stroke="#ffc94d" strokeWidth="5" fill="none" strokeLinecap="round" />
      ))}
      <rect x="150" y="34" width="36" height="24" rx="6" fill="#fff" stroke="#2f2f2f" strokeWidth="2" />
      <text x="168" y="51" textAnchor="middle" fontSize="12" fontWeight="800" fill="#2f2f2f">Na</text>
    </g>
  );
}

function Chips() {
  return (
    <g>
      <path d="M70 30 H150 L158 150 H62 Z" fill="#ffc94d" />
      <rect x="70" y="30" width="80" height="12" fill="#ff6d00" />
      <rect x="62" y="140" width="96" height="10" fill="#ff6d00" />
      <ellipse cx="110" cy="96" rx="26" ry="18" fill="#fff" />
      <text x="110" y="101" textAnchor="middle" fontSize="14" fontWeight="800" fill="#2f2f2f">×2</text>
    </g>
  );
}

function Apple() {
  return (
    <g>
      <path d="M100 58 C 70 40, 42 62, 48 100 C 54 138, 82 152, 100 140 C 118 152, 146 138, 152 100 C 158 62, 130 40, 100 58 Z" fill="#00b33f" />
      <path d="M100 58 C 100 46, 104 36, 112 30" stroke="#945300" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M108 40 C 122 30, 136 34, 140 42 C 128 48, 116 48, 108 40 Z" fill="#00b33f" />
      <rect x="164" y="76" width="30" height="62" rx="6" fill="#ffc94d" />
      <rect x="164" y="76" width="30" height="14" rx="6" fill="#ff6d00" />
    </g>
  );
}

function Bread() {
  return (
    <g>
      <path d="M52 96 C 52 62, 168 62, 168 96 V 146 H 52 Z" fill="#e0a45c" />
      <path d="M62 100 C 62 76, 158 76, 158 100 V 140 H 62 Z" fill="#f6dcb0" />
      {[[84, 110], [108, 122], [132, 106], [96, 130], [128, 128]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="4" ry="2.5" fill="#945300" />
      ))}
    </g>
  );
}

function Carton() {
  return (
    <g>
      <path d="M78 54 L110 32 L142 54 V150 H78 Z" fill="#fff" stroke="#2f2f2f" strokeWidth="2.5" />
      <path d="M78 54 H142" stroke="#2f2f2f" strokeWidth="2.5" />
      <circle cx="110" cy="102" r="22" fill="#ff6d00" />
      <path d="M110 80 C 112 72, 118 68, 124 68" stroke="#00b33f" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="128" y="20" width="6" height="40" rx="3" fill="#bd4be5" transform="rotate(18 131 40)" />
    </g>
  );
}

function Bottle() {
  return (
    <g>
      <rect x="96" y="26" width="28" height="22" rx="4" fill="#2f2f2f" />
      <rect x="70" y="48" width="80" height="100" rx="22" fill="#bd4be5" />
      <rect x="86" y="80" width="48" height="34" rx="8" fill="#fff" />
      <text x="110" y="102" textAnchor="middle" fontSize="13" fontWeight="800" fill="#2f2f2f">?</text>
      {[[160, 54], [172, 76], [158, 96]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={5 - i} fill="#bd4be5" opacity={0.5} />)}
    </g>
  );
}

function Tube() {
  return (
    <g>
      <path d="M64 120 L64 60 Q64 50 74 50 H146 Q156 50 156 60 L156 120 L140 140 H80 Z" fill="#00a9dd" />
      <rect x="92" y="140" width="36" height="16" rx="4" fill="#2f2f2f" />
      <rect x="82" y="70" width="56" height="30" rx="15" fill="#fff" />
      <text x="110" y="90" textAnchor="middle" fontSize="11" fontWeight="800" fill="#2f2f2f">“hypo”</text>
    </g>
  );
}

function Dryer() {
  return (
    <g>
      <circle cx="88" cy="78" r="38" fill="#bd4be5" />
      <circle cx="88" cy="78" r="16" fill="#fff" />
      <rect x="118" y="62" width="56" height="32" rx="8" fill="#bd4be5" />
      <rect x="74" y="110" width="26" height="46" rx="8" fill="#2f2f2f" />
      {[0, 1, 2].map(i => (
        <path key={i} d={`M182 ${66 + i * 12} q 10 -6 20 0`} stroke="#ff6d00" strokeWidth="4" fill="none" strokeLinecap="round" />
      ))}
    </g>
  );
}

function Pills() {
  return (
    <g>
      <rect x="62" y="56" width="60" height="96" rx="12" fill="#fff" stroke="#2f2f2f" strokeWidth="2.5" />
      <rect x="58" y="40" width="68" height="20" rx="6" fill="#00b33f" />
      <rect x="74" y="84" width="36" height="30" rx="6" fill="#00b33f" opacity="0.25" />
      <rect x="138" y="110" width="44" height="20" rx="10" fill="#ff6d00" transform="rotate(-25 160 120)" />
      <circle cx="160" cy="80" r="11" fill="#ffc94d" />
    </g>
  );
}

const SHAPES = { can: Can, noodles: Noodles, chips: Chips, apple: Apple, bread: Bread, carton: Carton, bottle: Bottle, tube: Tube, dryer: Dryer, pills: Pills };

export default function Illustration({ name, className }) {
  const Shape = SHAPES[name] || Apple;
  return (
    <svg className={className} viewBox="0 0 220 170" aria-hidden="true" style={{ background: BG[name] || '#f5f5f5' }}>
      <Shape />
    </svg>
  );
}
