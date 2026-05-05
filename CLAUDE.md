@AGENTS.md

## Git workflow

- `master` → Production (`data-joule.com`). Every push deploys live. Never commit untested changes directly here.
- `dev` → Vercel Preview environment. Default branch for all development work. Push here first, verify the Preview URL, then merge to `master`.
- Feature branches → branch off `dev`, push to get an isolated Preview URL, open a PR into `dev` when ready.

Vercel environment types:
- **Production** — `master` branch, live site, real Redis (`upstash-kv-pink-yacht`)
- **Preview** — any non-master branch, auto-generated `*.vercel.app` URL, same Redis for now
- **Development** — local only, secrets pulled via `vercel env pull .env.local --yes`

Re-pull env vars after any secret changes: `vercel env pull .env.local --yes`

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `JefBronze/data-joule-web` (uses the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
