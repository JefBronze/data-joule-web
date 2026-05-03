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

## Known Limitations

- **No rate limiting on `/api/ingest`** — an attacker with the `INGEST_API_KEY` could flood the endpoint and exhaust the Upstash free tier. Rate limiting is on the Week 4.2 roadmap.
- **No CSP header** — Content Security Policy is deferred to Week 4.2. The site currently relies on `X-Frame-Options`, `X-Content-Type-Options`, and `HSTS`.

## `security.txt`

```
https://data-joule.com/.well-known/security.txt
```
