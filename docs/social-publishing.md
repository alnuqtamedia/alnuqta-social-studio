# Social account linking — current deployment status

Independent studio Supabase project: `jlqveqfybjknviqvebeo`. Provider credentials are NOT configured and no live social account has been connected.

Deployed `studio-social` Edge Function version 1: `/health` returns HTTP 200 with `oauthConfigured:false` and `publishingAvailable:false`. `/youtube/callback` rejects missing state/cookie with HTTP 400. Callback: `https://jlqveqfybjknviqvebeo.supabase.co/functions/v1/studio-social/youtube/callback`.

Private `studio_oauth_records` table has RLS, no client grants/policies, service-only invoker RPCs for atomic state/ticket consumption, active Auth-session checks and five starts per user per minute. Database checks verified single use, expiry, rate limiting and denied client SELECT. RLS-with-no-policy INFO is intentional: clients have no direct credential access. No news-site database was changed.

The Edge handler implements authenticated owner-only initiation, first-party single-use handoff, HttpOnly/Secure/SameSite=Lax cookie binding, revocation-aware session checks, callback exchange/encrypted token storage and metadata-only account list. Google adapter adds exchange, identity, refresh and revoke. Tests use mock HTTP, not a live Google grant.

Still required: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `STUDIO_TOKEN_ENCRYPTION_KEY` (random 32 bytes encoded base64) through Edge secrets; independent studio owner Auth account and frontend login/account management; real browser consent and refresh/disconnect verification; provider upload pipeline. Callback redirect targets `social-accounts.html`, which is NOT yet deployed. Do not begin a real consent test until that frontend exists. Supabase gateway JWT verification is disabled only because callbacks cannot send it; authenticated routes validate bearer tokens with Auth and active sessions, callbacks require single-use state plus a bound server cookie.

Code history and remaining publication requirements follow:

## Original OAuth core scope

The current public studio is NOT connected to any social account. This branch adds a tested server-only OAuth/publication core. It does not deploy a service or configure a provider application. Do not add enabled connect/publish buttons until the remaining integration works.

## Implemented

`server/social-oauth.mjs`: authorization URL generation, random single-use state, session/provider binding, ten-minute expiry, optional S256 PKCE for providers supporting it, server-side exchange/identity adapter contract, required publishing scopes, AES-256-GCM encrypted tokens bound to owner/provider/account, publication ownership and atomic idempotency contract. Only a platform-confirmed post ID yields `published`. Errors after submission yield `unknown`, requiring reconciliation rather than automatic reposting.

`node scripts/test-social-oauth.mjs`: security and duplicate-publication regression tests with an in-memory TEST store and fake provider. This store is not a production database. No real OAuth or social post has been tested.

## Required production integration

- Independent studio backend and identity system; do not reuse news-site profiles, roles or article publishing policies.
- Durable private state/connection/publication storage. `takeState` must atomically delete-and-return a state. `claimPublication` must atomically enforce uniqueness on owner/provider/account/request ID. Do not expose encrypted credential records through public APIs.
- Authenticated HTTP handlers deriving user ID and session ID from a validated session, never request JSON. OAuth callbacks require a session-bound secure HttpOnly cookie. Initiation and publish handlers require CSRF/origin protection and rate limits. Logging must redact codes, state, tokens, cookies and query strings.
- Server environment encryption key and per-platform app credentials, entered only through hosting secret controls. Provider credentials must never go into HTML, GitHub or chat. Configure distinct, exact HTTPS callbacks per provider.
- Provider-specific adapters implementing exchange, identity, refresh, revoke and publish/status reconciliation against current official documentation. Preserve platform grant scopes and expiry. Core intentionally does not claim these adapters exist.
- Media upload storage, content/file limits, quotas, retry/reconciliation worker and retained publication results. Some platforms require reachable HTTPS media rather than local blob URLs.
- Browser account list, destination selection, consent, disconnect/revoke, publish preview and explicit publication action. Return only account display metadata; never credentials. Processing/pending is not published.

## External blockers

Meta developer registration is currently blocked at phone verification. No Meta app ID/secret or approved publishing configuration was supplied. YouTube/TikTok/Threads/X/LinkedIn developer applications and publishing permissions are not configured or verified. Some providers require app review/audit before public posting. Core implementation cannot replace those approvals.

## Security references

- https://www.rfc-editor.org/rfc/rfc9700.html
- https://www.rfc-editor.org/rfc/rfc7636.html

This branch must not be represented as a complete or production-ready social publishing service.
