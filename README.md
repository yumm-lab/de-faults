# de-faults

de-faults' page on [yummlab.site](https://yummlab.site), served at
https://yummlab.site/de-faults/. Opens from the de-faults avatar in the crew grid.

An animated field guide to using AI (what it is good for, the agentic loop, agent
patterns, productivity habits) in English and Thai, in a pixel-art style with live effects
from [pixelfx](https://github.com/patch-gg/pixelfx) (MIT, vendored subset). Static, no build step.

## Quick start

```sh
./dev init     # git hooks + tool check + ./dev check
./dev worker   # needs yumm-lab/yummlab.site at ../yummlab.site → https://localhost:8787/de-faults/
./dev          # every other command
```

[AGENTS.md](AGENTS.md) has the file map, how the page is served, and the rules for editing it.

## Deploy

Pushes to `main` deploy through `.github/workflows/deploy.yml` (check → deploy → live
byte-for-byte compare). Manual: `npx wrangler login`, then `./dev deploy`.

The `yummlab-site` Worker binds to this one (`yummlab-de-faults`), so this Worker must exist
before the main site deploys with the binding. Never delete or rename it without first
removing the binding there.

## Security

- No secrets belong in this repo.
- Deploy credentials live in the repo's `production` environment
  (`CLOUDFLARE_API_TOKEN` scoped to Account > Workers Scripts: Edit, and
  `CLOUDFLARE_ACCOUNT_ID`) or your local `wrangler login`, never in files here.
- A pre-commit hook in `.githooks/` rejects staged changes that look like credentials;
  `./dev init` enables it.
