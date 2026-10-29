export const PRODUCT_TYPES = ['Food', 'Beverage', 'Condiment', 'Cosmetic/Skincare', 'Makeup', 'Medicine', 'Vitamin/Supplement', 'Baby Product', 'Household Product'];

export const STATUS = {
  safe:       { label: 'Fine',                color: 'var(--safe)' },
  caution:    { label: 'Use with care',       color: 'var(--caution)' },
  allergen:   { label: 'Allergen',            color: 'var(--allergen)' },
  harmful:    { label: 'Harmful',             color: 'var(--harmful)' },
  carcinogen: { label: 'Possible carcinogen', color: 'var(--carcinogen)' },
};
export const STATUS_ORDER = ['safe', 'caution', 'allergen', 'harmful', 'carcinogen'];

export function scoreTone(score) {
  if (score >= 80) return 'var(--safe)';
  if (score >= 60) return 'var(--caution)';
  if (score >= 40) return 'var(--allergen)';
  return 'var(--harmful)';
}

// Counts come from the ingredient list itself so the totals always match the rows.
export function countStatuses(result) {
  const list = result.ingredients || [];
  if (!list.length) return result.counts || {};
  return list.reduce((acc, i) => ({ ...acc, [i.status]: (acc[i.status] || 0) + 1 }), {});
}

export function isFlagged(ingredient) {
  return ['allergen', 'harmful', 'carcinogen'].includes(ingredient.status)
    || ['moderate', 'high'].includes(ingredient.userRisk);
}

// localStorage can throw (private mode, full quota); the app must keep working without it.
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Not saved; the app still works for this visit.
  }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This photo format can’t be opened. Try a JPEG or PNG.')); };
    img.src = url;
  });
}

function drawScaled(img, maxEdge, quality) {
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

// Phone photos are often 5–10 MB. Shrinking to 1568px (the largest size Claude
// uses without downscaling) keeps uploads fast and well inside Worker limits.
export async function prepareImage(file) {
  const img = await loadImage(file);
  const dataUrl = drawScaled(img, 1568, 0.85);
  return {
    preview: dataUrl,
    base64: dataUrl.split(',')[1],
    mediaType: 'image/jpeg',
    thumb: drawScaled(img, 160, 0.7),
  };
}

// Lowercased product name + ingredient names, for matching against content terms.
export function scanText(result) {
  return [result.productName, ...(result.ingredients || []).map(i => i.name)].filter(Boolean).join(' ').toLowerCase();
}

const DAY = Math.floor(Date.now() / 86_400_000);

// Today's fact. Prefers facts linked to recent scans, then to the user's health
// conditions; otherwise rotates daily. `offset` lets the user page to the next fact.
export function pickDiscovery(items, history, profile, offset = 0) {
  if (!items.length) return null;

  const linked = [];
  for (const scan of history.slice(0, 5)) {
    const text = scanText(scan);
    for (const item of items) {
      if (!linked.some(l => l.item.id === item.id) && item.matchTerms.some(t => text.includes(t))) linked.push({ item, scan });
    }
  }

  const wanted = [
    profile.medical?.includes('Diabetes') && 'sugar',
    profile.medical?.includes('High Blood Pressure') && 'sodium',
  ].filter(Boolean);
  const forProfile = items.filter(i => i.tags.some(t => wanted.includes(t)) && !linked.some(l => l.item.id === i.id)).map(item => ({ item }));
  const rest = items.filter(i => !linked.some(l => l.item.id === i.id) && !forProfile.some(p => p.item.id === i.id)).map(item => ({ item }));

  // Personal picks first, the rest in daily rotation.
  const rotated = rest.map((_, i) => rest[(i + DAY) % rest.length]);
  const ordered = [...linked, ...forProfile, ...rotated];
  return ordered[(offset % ordered.length + ordered.length) % ordered.length];
}

export function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}
