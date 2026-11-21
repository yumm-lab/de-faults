# de-faults

de-faults' page on [yummlab.site](https://yummlab.site), served at
https://yummlab.site/de-faults/. Opens from the de-faults avatar in the crew grid.

Static, no build step. The detail page is still to come; for now it is a placeholder.

## How it is served

This repo deploys its own Cloudflare Worker, `yummlab-de-faults`. That Worker has
no routes and no public hostname. The `yummlab-site` Worker
([yumm-lab/yummlab.site](https://github.com/yumm-lab/yummlab.site)) owns the
`yummlab.site` domain and forwards `/de-faults` and `/de-faults/*` to it through a
service binding (`DE_FAULTS`), with the URL unchanged.

So:

- Files live under `public/de-faults/`, matching the public path.
- The page can use the main site's files by absolute path (`/tokens.css`,
  `/theme.js`, `/favicon.svg`), since both are on the same origin.
- `public/_headers` here sets the headers for this page. The main site's
  `_headers` does not apply to responses from this Worker.

| Path | What |
| --- | --- |
| `public/de-faults/index.html` | The page. |
| `public/de-faults/page.css` | Page styles; tokens come from the main site's `/tokens.css`. |
| `public/_headers` | Security and cache headers (same CSP as the main site). |
| `src/worker.js` | Serves `public/` as is. |

## Run locally

From a yummlab.site checkout next to this one, run both Workers together:

```sh
npx wrangler dev -c wrangler.toml -c ../de-faults/wrangler.toml --local-protocol https
# open https://localhost:8787/de-faults/  (self-signed cert)
```

## Deploy

Pushes to `main` deploy through `.github/workflows/deploy.yml`, or run:

```sh
npx wrangler login
npx wrangler deploy
```

The `yummlab-site` Worker binds to this one, so this Worker must exist before the
main site deploys with the binding. Never delete or rename it without first
removing the binding there.

## Security

- No secrets belong in this repo.
- Deploy credentials live in the repo's `production` environment
  (`CLOUDFLARE_API_TOKEN` scoped to Account > Workers Scripts: Edit, and
  `CLOUDFLARE_ACCOUNT_ID`) or your local `wrangler login`, never in files here.
- A pre-commit hook in `.githooks/` rejects staged changes that look like credentials.
  Enable it once per clone: `git config core.hooksPath .githooks`
