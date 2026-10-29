# Unpack

Snap an ingredient label, see what's safe for you. React + Cloudflare Workers + free Workers AI (Llama 4 Scout).

Live: https://ingredient-guardian.prakasha.workers.dev

## Run locally

```bash
npm install
npx wrangler login   # Workers AI runs on your Cloudflare account, even locally
npm run dev
```

## Deploy (Cloudflare free plan)

```bash
npm run deploy
```

Or connect the repo in the dashboard (**Settings → Build**): build `npm run build`, deploy `npx wrangler deploy`.

## Switch to Claude (optional, better answers)

Add credit at console.anthropic.com, then in **Settings → Variables and Secrets** add:
- secret `ANTHROPIC_API_KEY`
- text variable `AI_PROVIDER` = `claude`

## Notes

- The Worker fixes the prompt and model, so the endpoint can't be misused.
- Workers AI free plan: a daily allowance, plenty for personal use.
- Profile and history are saved on the phone only.
- AI can be wrong. Not medical advice.
