// Cloudflare Worker: serves /api/analyze. Everything else is the static React app.
// The Anthropic key lives in the ANTHROPIC_API_KEY secret and never reaches the browser.
// The browser only sends product details; the prompt and model are fixed here,
// so nobody can use this endpoint as a free proxy to the Anthropic API.

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-haiku-5-5';

const PRODUCT_TYPES = ['Food', 'Beverage', 'Condiment', 'Cosmetic/Skincare', 'Makeup', 'Medicine', 'Vitamin/Supplement', 'Baby Product', 'Household Product'];
const PROFILE = {
  type: ['Adult', 'Child', 'Baby', 'Pregnant', 'Elderly'],
  allergies: ['Nuts', 'Dairy', 'Soy', 'Gluten', 'Shellfish', 'Egg', 'Sesame', 'Fish'],
  medical: ['Diabetes', 'High Blood Pressure', 'Kidney Disease', 'Liver Disease', 'Heart Disease'],
  lifestyle: ['Vegan', 'Vegetarian', 'Halal', 'Kosher', 'Organic Only'],
};
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BASE64 = 5_000_000; // the app shrinks photos to well under this
const MAX_INGREDIENTS_CHARS = 6000;

const SCHEMA = `{
  "productName": "string (inferred or provided)",
  "productType": "string",
  "overallScore": number (0-100, higher is safer),
  "scoreLabel": "Excellent|Good|Moderate Risk|Avoid",
  "summary": "one short plain sentence, max 12 words",
  "alerts": ["max 8 words, only if it matters for this user's profile", ...],
  "ingredients": [
    {
      "name": "ingredient name",
      "status": "safe|caution|allergen|harmful|carcinogen",
      "purpose": "2-4 words",
      "riskLevel": "Safe|Low Risk|Moderate Risk|High Risk",
      "tags": ["Allergen|Irritant|Carcinogenic|Hormone Disruptor|Neurotoxin|Environmental Hazard|Pregnancy Warning|Child Safety Concern"],
      "concerns": ["max 8 words each, at most 2; empty if none"],
      "ageSuitability": { "infants": "Safe|Caution|Avoid", "children": "Safe|Caution|Avoid", "adults": "Safe|Caution|Avoid", "seniors": "Safe|Caution|Avoid", "pregnant": "Safe|Caution|Avoid" },
      "userRisk": "none|low|moderate|high"
    }
  ],
  "ageSummary": { "infants": "max 8 words", "children": "max 8 words", "adults": "max 8 words", "seniors": "max 8 words" },
  "counts": { "safe": n, "caution": n, "allergen": n, "harmful": n, "carcinogen": n }
}`;

class InputError extends Error {}

function pickString(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function pickList(value, allowed) {
  return Array.isArray(value) ? value.filter(v => allowed.includes(v)) : [];
}

function readRequest(body) {
  if (!body || typeof body !== 'object') throw new InputError('Request body must be JSON.');

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
    if (!IMAGE_TYPES.includes(mediaType)) throw new InputError('Photo must be a JPEG, PNG or WebP image.');
    if (typeof data !== 'string' || !data || data.length > MAX_IMAGE_BASE64) throw new InputError('Photo is missing or too large.');
    return { productType, productName, profile, image: { mediaType, data } };
  }

  const ingredients = pickString(body.ingredients, MAX_INGREDIENTS_CHARS);
  if (!ingredients) throw new InputError('Add an ingredient list or a photo of the label.');
  return { productType, productName, profile, ingredients };
}

function buildPrompt({ productType, productName, profile, ingredients }) {
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

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('The analysis came back in an unexpected format.');
  return JSON.parse(text.slice(start, end + 1));
}

async function analyze(request, env) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  let input;
  try {
    input = readRequest(await request.json());
  } catch (e) {
    const message = e instanceof InputError ? e.message : 'Request body must be JSON.';
    return Response.json({ error: message }, { status: 400 });
  }

  if (!env.ANTHROPIC_API_KEY) return Response.json({ error: 'ANTHROPIC_API_KEY is not set on the server.' }, { status: 500 });

  const content = input.image
    ? [
        { type: 'image', source: { type: 'base64', media_type: input.image.mediaType, data: input.image.data } },
        { type: 'text', text: buildPrompt(input) },
      ]
    : buildPrompt(input);

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content }],
    });

    if (message.stop_reason === 'refusal') {
      return Response.json({ error: 'This product could not be analyzed. Try a clearer ingredient list.' }, { status: 422 });
    }
    if (message.stop_reason === 'max_tokens') {
      return Response.json({ error: 'The ingredient list is too long to analyze in one go. Try a shorter list.' }, { status: 422 });
    }

    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const result = extractJson(text);
    return Response.json(result);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      return Response.json({ error: 'Too many checks right now. Wait a minute and try again.' }, { status: 429 });
    }
    if (e instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: 'The server API key is invalid.' }, { status: 500 });
    }
    if (e instanceof Anthropic.APIError) {
      return Response.json({ error: `Anthropic API error (${e.status}): ${e.message}` }, { status: 502 });
    }
    console.error('analyze failed', e);
    return Response.json({ error: e.message || 'Analysis failed.' }, { status: 500 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/analyze') return analyze(request, env);
    return Response.json({ error: 'Not found' }, { status: 404 });
  },
};
