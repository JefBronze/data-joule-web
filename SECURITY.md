# Security Policy — data-joule-web

## Reporting a Vulnerability

**Do not file a public GitHub issue for security vulnerabilities.**

Email: **jefersonbronze@gmail.com**

Include: description, impact, steps to reproduce, affected endpoint, and your suggested fix if you have one. You will receive an acknowledgement within **48 hours** and a resolution timeline within **7 days**.

## Disclosure Policy

90-day coordinated disclosure. We will credit you in the release notes unless you prefer to remain anonymous.

## Scope

### In scope

| Surface | What to look for |
|---------|-----------------|
| `POST /api/ingest` | Authentication bypass, data injection, rate-limit abuse, DoS via large payloads |
| `GET /api/state` | Information disclosure, cache poisoning |
| `next.config.ts` security headers | Missing or misconfigured headers (CSP, HSTS, etc.) |
| Upstash Redis access | Key exposure via client-side leakage, unauthorized reads |

### Out of scope

- The Raspberry Pi hardware and home lab network
- Vercel platform infrastructure
- Upstash Redis infrastructure
- Social engineering attacks

## Security Controls

| Control | Status |
|---------|--------|
| Bearer auth on `/api/ingest` | ✅ Implemented |
| Rate limiting on `/api/ingest` | ✅ 30 req/min per IP + 120 req/min global ceiling (`@upstash/ratelimit`, dual sliding window) |
| Payload validation on `/api/ingest` | ✅ Field ranges, enum allowlists, 1 KB size cap, ±5 min timestamp drift |
| Content Security Policy | ✅ `default-src 'self'`, no external script/font/connect sources |
| HSTS | ✅ 2-year max-age with preload |
| X-Frame-Options | ✅ DENY |

## Known Limitations

- **`unsafe-inline` in CSP** — Next.js requires `'unsafe-inline'` for script and style without a per-request nonce infrastructure. External script injection from third-party domains is still blocked.
- **Control agent (:8081) has no auth** — protected only by the home LAN. Tier 4.2 roadmap item.

## `security.txt`

```
https://data-joule.com/.well-known/security.txt
```
