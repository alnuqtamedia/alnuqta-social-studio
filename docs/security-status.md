# Studio Edge Function security status

Completed on 2026-09-19 against Supabase project `zsqvmuqlmtnhndwuqlfy`.

The four production functions now:

- reject missing or unapproved `Origin` values with HTTP 403;
- return CORS only for the verified studio origin;
- use a SHA-256 network fingerprint rather than storing a raw IP;
- enforce an atomic limit of 20 requests per function and fingerprint per hour;
- return HTTP 429 and `Retry-After` when the limit is exhausted.

Live checks passed for missing Origin (403), an unapproved Origin (403), the
approved GitHub Pages Origin (204 preflight), and an approved request reaching
application validation.

The implementation is versioned in
[`alnuqta-media/supabase/functions`](https://github.com/alnuqtamedia/alnuqta-media/tree/main/supabase/functions),
with database migrations in
[`alnuqta-media/supabase/migrations`](https://github.com/alnuqtamedia/alnuqta-media/tree/main/supabase/migrations).

## Limitation

Origin checks are browser abuse protection, not authentication: a command-line
client can forge an Origin header. The server-side rate limit is therefore still
required. GitHub Pages project paths also share the same host origin; use a
dedicated studio subdomain if path-level separation is required.
