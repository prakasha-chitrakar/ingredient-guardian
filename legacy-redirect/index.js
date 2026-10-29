// The app moved from ingredient-guardian.prakasha.workers.dev (and briefly unpack.prakasha.workers.dev)
// to unlabel.prakasha.workers.dev.
// This Worker keeps old links working by sending every request to the same path there.
// Deploy for each old name:
//   npx wrangler deploy --config legacy-redirect/wrangler.jsonc
//   npx wrangler deploy --config legacy-redirect/wrangler.jsonc --name unpack

const NEW_ORIGIN = 'https://unlabel.prakasha.workers.dev';

export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect(NEW_ORIGIN + url.pathname + url.search, 301);
  },
};
