// Cloudflare Worker: serves /api/analyze. Everything else is the static React app.
// The browser only sends product details; the prompt and model are fixed here,
// so nobody can use this endpoint to run their own prompts on your account.
//
// AI provider:
//   default  → Cloudflare Workers AI (free daily allowance, no API key needed)
//   AI_PROVIDER=claude → Claude Haiku 5.5 (needs the ANTHROPIC_API_KEY secret and Anthropic credit)

import Anthropic from '@anthropic-ai/sdk';

// Photos need a model that can see; typed lists use a much faster text model
// (measured: ~5 s vs ~20 s, same allergen catches on our test labels).
const VISION_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
const TEXT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const CACHE_TTL = 60 * 60 * 24 * 30; // remember identical checks for 30 days
const CLAUDE_MODEL = 'claude-haiku-5-5';

const PRODUCT_TYPES = ['Food', 'Beverage', 'Condiment', 'Cosmetic/Skincare', 'Hair Care', 'Makeup', 'Medicine', 'Vitamin/Supplement', 'Baby Product', 'Household Product'];
const PROFILE = {
  type: ['Adult', 'Child', 'Baby', 'Pregnant', 'Elderly'],
  allergies: ['Nuts', 'Dairy', 'Soy', 'Gluten', 'Shellfish', 'Egg', 'Sesame', 'Fish'],
  medical: ['Diabetes', 'High Blood Pressure', 'Kidney Disease', 'Liver Disease', 'Heart Disease'],
  lifestyle: ['Vegan', 'Vegetarian', 'Halal', 'Kosher', 'Organic Only'],
};
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BASE64 = 5_000_000; // the app shrinks photos to well under this
const MAX_INGREDIENTS_CHARS = 6000;

// Kept deliberately small: every extra field per ingredient adds output tokens,
// and output length is most of the wait.
const SCHEMA = `{
  "productName": "string (inferred or provided)",
  "overallScore": number (0-100, higher is safer),
  "scoreLabel": "Excellent|Good|Moderate Risk|Avoid",
  "summary": "one short plain sentence, max 12 words",
  "alerts": ["max 8 words, only if it matters for this user's profile"],
  "ingredients": [
    {
      "name": "ingredient name",
      "status": "safe|caution|allergen|harmful|carcinogen",
      "purpose": "2-4 words",
      "tags": ["only if relevant: Allergen|Irritant|Carcinogenic|Hormone Disruptor|Neurotoxin|Pregnancy Warning|Child Safety Concern"],
      "concerns": ["max 8 words each, at most 2; empty for safe ingredients"],
      "userRisk": "none|low|moderate|high"
    }
  ],
  "ageSummary": { "infants": "max 8 words", "children": "max 8 words", "adults": "max 8 words", "seniors": "max 8 words" }
}`;

class InputError extends Error {}

// An error whose message is safe and useful to show in the app.
class UserFacingError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function pickString(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function pickList(value, allowed) {
  return Array.isArray(value) ? value.filter(v => allowed.includes(v)) : [];
}

function readRequest(body) {
  if (!body || typeof body !== 'object') throw new InputError('Request must be valid JSON.');

  const productType = PRODUCT_TYPES.includes(body.productType) ? body.productType : 'Food';
  const productName = pickString(body.productName, 120);
  const p = body.profile || {};
  const profile = {
    type: PROFILE.type.includes(p.type) ? p.type : 'Adult',
    allergies: pickList(p.allergies, PROFILE.allergies),
    medical: pickList(p.medical, PROFILE.medical),
    lifestyle: pickList(p.lifestyle, PROFILE.lifestyle),
  };

  if (body.image) {
    const { mediaType, data } = body.image;
    if (!IMAGE_TYPES.includes(mediaType)) throw new InputError('Use a JPEG, PNG or WebP photo.');
    if (typeof data !== 'string' || !data || data.length > MAX_IMAGE_BASE64) throw new InputError('Photo missing or too large.');
    return { productType, productName, profile, image: { mediaType, data } };
  }

  const ingredients = pickString(body.ingredients, MAX_INGREDIENTS_CHARS);
  if (!ingredients) throw new InputError('Add an ingredient list or a label photo.');
  return { productType, productName, profile, ingredients };
}

export function buildPrompt({ productType, productName, profile, ingredients }) {
  const who = [
    `Scanning for: ${profile.type}`,
    profile.allergies.length && `Allergies: ${profile.allergies.join(', ')}`,
    profile.medical.length && `Medical conditions: ${profile.medical.join(', ')}`,
    profile.lifestyle.length && `Lifestyle: ${profile.lifestyle.join(', ')}`,
  ].filter(Boolean).join('\n');

  const source = ingredients
    ? `Ingredients:\n${ingredients}`
    : 'The ingredient list is in the attached photo. Read every ingredient you can see. If the photo has no readable ingredient list, return an empty "ingredients" array and say so in "summary".';

  return `You are an expert ingredient safety analyst. Analyze this product for health risks, allergens and suitability, judged against the user's profile.

Product type: ${productType}
${productName ? `Product name: ${productName}\n` : ''}${source}

${who}

Keep every text field short and plain, like a friend reading the label in a shop.
Return ONLY valid JSON (no markdown, no preamble) in exactly this structure:
${SCHEMA}`;
}

export function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new UserFacingError('We couldn’t read the result. Try again.', 502);
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new UserFacingError('We couldn’t read the result. Try again.', 502);
  }
}

async function askWorkersAI(env, input) {
  const prompt = buildPrompt(input);
  const content = input.image
    ? [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${input.image.mediaType};base64,${input.image.data}` } },
      ]
    : prompt;

  let out;
  try {
    out = await env.AI.run(input.image ? VISION_MODEL : TEXT_MODEL, {
      messages: [{ role: 'user', content }],
      max_tokens: 4096,
      temperature: 0.2,
    });
  } catch (e) {
    console.error('Workers AI failed', e);
    if (/daily free allocation|neurons|4006/i.test(e.message)) {
      throw new UserFacingError('You’ve used today’s free checks. Come back tomorrow.', 429);
    }
    throw new UserFacingError('We’re busy right now. Try again shortly.', 502);
  }

  // Some models return the JSON already parsed.
  if (out?.response && typeof out.response === 'object') return out.response;
  return extractJson(String(out?.response ?? ''));
}

async function askClaude(env, input) {
  if (!env.ANTHROPIC_API_KEY) throw new UserFacingError('ANTHROPIC_API_KEY is not set on the server.', 500);

  const content = input.image
    ? [
        { type: 'image', source: { type: 'base64', media_type: input.image.mediaType, data: input.image.data } },
        { type: 'text', text: buildPrompt(input) },
      ]
    : buildPrompt(input);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  let message;
  try {
    message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content }],
    });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new UserFacingError('Too many checks at once. Try again in a minute.', 429);
    if (e instanceof Anthropic.AuthenticationError) throw new UserFacingError('The server API key is invalid.', 500);
    if (e instanceof Anthropic.APIError) throw new UserFacingError(`Anthropic API error (${e.status}): ${e.message}`, 502);
    throw e;
  }

  if (message.stop_reason === 'refusal') throw new UserFacingError('Couldn’t analyse this product. Try a clearer label.', 422);
  if (message.stop_reason === 'max_tokens') throw new UserFacingError('That list is too long. Try a shorter one.', 422);

  return extractJson(message.content.filter(b => b.type === 'text').map(b => b.text).join(''));
}

// ---------- Barcode lookup (Open Food Facts, then Open Beauty Facts) ----------

const LOOKUP_UA = 'Unlabel/2.0 (https://unlabel.prakasha.workers.dev)';
const LOOKUP_FIELDS = 'code,product_name,brands,ingredients_text,ingredients_text_en,categories_tags,image_front_small_url';
const DATABASES = [
  { host: 'world.openfoodfacts.org', source: 'Open Food Facts' },
  { host: 'world.openbeautyfacts.org', source: 'Open Beauty Facts' },
];

// Category tags look like "en:beverages" or "en:plant-based-foods-and-beverages", so
// match whole tags; a substring match would call noodles a beverage.
function guessType(categories = [], source) {
  const has = (re) => categories.some(t => re.test(t.replace(/^[a-z]{2}:/, '')));
  if (source === 'Open Beauty Facts') {
    if (has(/^(hair|shampoos?|conditioners?|hair-)/)) return 'Hair Care';
    if (has(/^(make-?up|lipsticks?|mascaras?|foundations?)/)) return 'Makeup';
    if (has(/^baby/)) return 'Baby Product';
    return 'Cosmetic/Skincare';
  }
  if (has(/^(beverages|drinks|sodas|juices|fruit-juices|waters|teas|coffees|carbonated-drinks)$/)) return 'Beverage';
  if (has(/^(sauces|condiments|ketchup|spreads)$/)) return 'Condiment';
  if (has(/^(dietary-supplements|vitamins|food-supplements)$/)) return 'Vitamin/Supplement';
  if (has(/^(baby-foods|infant-formulas?)$/)) return 'Baby Product';
  return 'Food';
}

function productLabel(brands, name) {
  const brand = brands?.split(',')[0]?.trim();
  if (!name) return brand || null;
  // "COCA-COLA SERVICES SA/NV" + "Coca-Cola Original" → just the product name.
  const brandWord = brand?.split(/\s+/)[0]?.toLowerCase();
  return brand && !name.toLowerCase().includes(brandWord) ? `${brand} ${name}` : name;
}

async function lookupBarcode(request, env, ctx) {
  const code = new URL(request.url).searchParams.get('code') || '';
  if (!/^\d{8,14}$/.test(code)) return Response.json({ error: 'That barcode doesn’t look right.' }, { status: 400 });

  const key = `barcode:v2:${code}`;
  const cached = env.ANSWERS ? await env.ANSWERS.get(key, 'json').catch(() => null) : null;
  if (cached) return Response.json(cached);

  let found = null;
  for (const db of DATABASES) {
    try {
      const res = await fetch(`https://${db.host}/api/v2/product/${code}.json?fields=${LOOKUP_FIELDS}`, { headers: { 'User-Agent': LOOKUP_UA } });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status !== 1 || !data.product) continue;
      const p = data.product;
      found = {
        found: true,
        code,
        source: db.source,
        productName: productLabel(p.brands, p.product_name?.trim()),
        ingredients: (p.ingredients_text_en || p.ingredients_text || '').replace(/\s+/g, ' ').trim(),
        productType: guessType(p.categories_tags, db.source),
        image: p.image_front_small_url || null,
      };
      if (found.ingredients) break;
    } catch {
      // Database unreachable: try the next one.
    }
  }

  const body = found || { found: false, code };
  if (env.ANSWERS) ctx.waitUntil(env.ANSWERS.put(key, JSON.stringify(body), { expirationTtl: 60 * 60 * 24 * 7 }).catch(() => {}));
  return Response.json(body);
}

// Same label + same profile + same AI → same key. Text is normalised so spacing and
// capitalisation don't matter; photos are keyed by a hash of their bytes.
async function cacheKey(input, env) {
  const digest = async (s) => {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  };
  const { image, ingredients, ...rest } = input;
  const body = {
    v: 2,
    provider: env.AI_PROVIDER === 'claude' ? CLAUDE_MODEL : image ? VISION_MODEL : TEXT_MODEL,
    ...rest,
    ingredients: ingredients?.toLowerCase().replace(/\s+/g, ' ').trim(),
    image: image ? await digest(image.data) : null,
  };
  return `check:${await digest(JSON.stringify(body))}`;
}

async function analyze(request, env, ctx) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  let input;
  try {
    input = readRequest(await request.json());
  } catch (e) {
    const message = e instanceof InputError ? e.message : 'Request must be valid JSON.';
    return Response.json({ error: message }, { status: 400 });
  }

  const key = env.ANSWERS ? await cacheKey(input, env) : null;
  if (key) {
    const cached = await env.ANSWERS.get(key, 'json').catch(() => null);
    if (cached) return Response.json({ ...cached, cached: true });
  }

  try {
    const result = env.AI_PROVIDER === 'claude' ? await askClaude(env, input) : await askWorkersAI(env, input);
    result.productType = input.productType;
    if (key && Array.isArray(result.ingredients) && result.ingredients.length) {
      ctx.waitUntil(env.ANSWERS.put(key, JSON.stringify(result), { expirationTtl: CACHE_TTL }).catch(() => {}));
    }
    return Response.json(result);
  } catch (e) {
    if (e instanceof UserFacingError) return Response.json({ error: e.message }, { status: e.status });
    console.error('analyze failed', e);
    return Response.json({ error: 'Check failed. Try again.' }, { status: 500 });
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/analyze') return analyze(request, env, ctx);
    if (url.pathname === '/api/barcode') return lookupBarcode(request, env, ctx);
    return Response.json({ error: 'Not found' }, { status: 404 });
  },
};
