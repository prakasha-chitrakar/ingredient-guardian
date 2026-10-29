// Cloudflare Worker: serves /api/analyze. Everything else is the static React app.
// The browser only sends product details; the prompt and model are fixed here,
// so nobody can use this endpoint to run their own prompts on your account.
//
// AI provider:
//   default  → Cloudflare Workers AI (free daily allowance, no API key needed)
//   AI_PROVIDER=claude → Claude Haiku 5.5 (needs the ANTHROPIC_API_KEY secret and Anthropic credit)

import Anthropic from '@anthropic-ai/sdk';

const WORKERS_AI_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
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
  if (start === -1 || end <= start) throw new UserFacingError('The analysis came back in an unexpected format. Try again.', 502);
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new UserFacingError('The analysis came back in an unexpected format. Try again.', 502);
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
    out = await env.AI.run(WORKERS_AI_MODEL, {
      messages: [{ role: 'user', content }],
      max_tokens: 4096,
      temperature: 0.2,
    });
  } catch (e) {
    console.error('Workers AI failed', e);
    if (/daily free allocation|neurons|4006/i.test(e.message)) {
      throw new UserFacingError('Daily free limit reached. Try again tomorrow.', 429);
    }
    throw new UserFacingError('The AI service is busy. Try again.', 502);
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
    if (e instanceof Anthropic.RateLimitError) throw new UserFacingError('Too many checks right now. Try again in a minute.', 429);
    if (e instanceof Anthropic.AuthenticationError) throw new UserFacingError('The server API key is invalid.', 500);
    if (e instanceof Anthropic.APIError) throw new UserFacingError(`Anthropic API error (${e.status}): ${e.message}`, 502);
    throw e;
  }

  if (message.stop_reason === 'refusal') throw new UserFacingError('This product could not be analyzed. Try a clearer ingredient list.', 422);
  if (message.stop_reason === 'max_tokens') throw new UserFacingError('The ingredient list is too long. Try a shorter list.', 422);

  return extractJson(message.content.filter(b => b.type === 'text').map(b => b.text).join(''));
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

  try {
    const result = env.AI_PROVIDER === 'claude' ? await askClaude(env, input) : await askWorkersAI(env, input);
    return Response.json(result);
  } catch (e) {
    if (e instanceof UserFacingError) return Response.json({ error: e.message }, { status: e.status });
    console.error('analyze failed', e);
    return Response.json({ error: 'Analysis failed. Try again.' }, { status: 500 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/analyze') return analyze(request, env);
    return Response.json({ error: 'Not found' }, { status: 404 });
  },
};
