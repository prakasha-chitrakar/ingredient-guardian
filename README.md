# Ingredient Guardian

Snap an ingredient label, see what's safe for you. React + Cloudflare Workers + Claude Haiku 5.5.

## Run locally

```bash
npm install
cp .dev.vars.example .dev.vars   # add your ANTHROPIC_API_KEY
npm run dev
```

## Deploy (Cloudflare free plan)

1. Cloudflare dashboard → **Workers & Pages → Create → Import a repository** → this repo.
2. Build command `npm run build`, deploy command `npx wrangler deploy`.
3. **Settings → Variables and Secrets** → add secret `ANTHROPIC_API_KEY`, then redeploy.

Pushes to `main` go live; other branches get a preview URL.

## Notes

- The API key stays on Cloudflare. The Worker fixes the prompt and model, so the endpoint can't be misused.
- Profile and history are saved on the phone only.
- AI can be wrong. Not medical advice.
