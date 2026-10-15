# Phase A isolated resilience preview — 2026-10-15

Baseline: `56c1d393a01c0a0e1023cea76c92c52c1a066660`.
Backup branch: `backup/studio-before-resilience-20261015`.
Development branch: `dev/studio-resilience-20261015`. Do not merge before owner acceptance.

## Scope

- Original `*-preview` functions, `_shared`, `backend`, production origin rules and database schema are unchanged.
- Separate `*-dev` functions import `_shared_dev` only. Exact preview origin is pinned in that bundle, not a project-global secret. JWT verification remains on.
- SQL was inspected read-only: its allowlist accepts four original function buckets only. Dev functions intentionally share those existing hourly buckets (20/hour/IP/function) and Google keys/quotas. There is no independent free quota and no limit increase.
- Unified client replaces both legacy planner retries and legacy TTS retries. Each logical request has a persisted deadline/count. Maximum three frontend requests total, including automatic resume; speech uses one frontend request with up to two Flash models. No Pro fallback.
- Circuit opens 90 seconds after two temporary failures; endpoint queue is capped at two concurrent operations. Retry-After is never shortened. Zero quota and studio hourly limit require explicit resume; cancellation/offline stops automatic resumption. Reload offers manual resume only.
- Candidates and decisions survive failed review. Manual adoption preserves source, license, date and required attribution; never calls it automated review. One missing thumbnail cannot discard other candidates. No new media provider.
- Separate IndexedDB `alnuqta-studio-jobs` v1, jobs/cache stores, five recent checkpoints; 64 MiB LRU response/audio cache. Existing projects DB stays v1. Blobs remain local; cache is not permanent storage and browser deletion/quota failure can remove/prevent local persistence. Error is visible.
- Audio is a continuous performance, keyed by full text, voice, style, model-policy version, format and grouping. Visual changes preserve narration and timing. Full text/voice/style changes require confirmation before replacing existing narration. Old preview download signature now includes voice settings and requested duration.

## Validation

`npm ci && npm test`: passed before preview publication; rerun after subsequent edits.
New tests cover: overload followed by success, zero quota/no repeat, Retry-After and reopening, same persisted attempt budget, circuit and cancellation, queue bound, independent IndexedDB/legacy reopen, Blob and cache TTL/limits, failed review/reload without re-search or TTS, manual CC BY attribution, no TTS for unchanged visuals, and unchanged production source bundles. Dev thumbnail regression includes an unavailable candidate alongside a valid one.

Live deployment versions, preview URL and browser acceptance results are recorded below after actual verification. No full video or performance/semantic perfection claim is implied by unit tests. Owner acceptance requires one new 30–45s report. Existing completed videos are out of scope.

## Rollback

Leave main and original functions unchanged; close the PR and stop using this dev URL. Existing saved projects remain untouched. Dev functions can be removed separately if no longer needed; no database migration or billing rollback is needed. Do not delete saved projects or browser databases to roll back.

## Follow-up outside A

Do not start geographic policy expansion, new numeric overlays, CapCut packages, local TTS installs, paid services, or production promotion until owner tests this preview. Image synthesis controls in the isolated preview explicitly remain outside this phase; licensed media/user uploads remain available. No image-provider fallback is silently invoked.

## Live verification (2026-10-15)

- Preview (Vercel, READY): https://alnuqta-social-studio-git-dev-studio-resili-2b56ca-alnuqtamedia.vercel.app/
- Draft PR: https://github.com/alnuqtamedia/alnuqta-social-studio/pull/6
- Isolated dev functions deployed as v1, JWT verification on. Original versions verified unchanged: studio-preview 17, tts-preview 7, pexels-preview 4. Main remains baseline.
- GitHub Actions Validate Studio run 120 passed. The first CI run failed because a shallow PR checkout lacked origin/main; isolation now verifies a protected-file digest manifest instead of assuming Git refs exist.
- Browser: new report command encountered real Google high-demand/timeout errors. Bounded attempts stopped and a saved resume action remained after reload. Full AI-generated 30s video is NOT verified.
- Browser: local test script plus Commons search returned six candidates across two scenes despite Gemini review being unavailable. Source, creator, CC BY/public-domain license, attribution requirement and archive date were visible. Manual adoption populated both scenes, explicitly reported manual review and retained required CC BY publishing attribution. No new narration was requested by those manual choices.
- Local-script test intentionally has no narration; it is not a completed video and must remain incomplete until narration exists.
- Fix: restore checkpoint contents before rejecting an early retry, so a provider wait never blocks access to the saved material itself. Recovery and original-project compatibility are also tested with fake IndexedDB.
- Netlify preview built but team protection requires login; Vercel preview opens without this obstacle. No protection was disabled.

Remaining acceptance: owner tries a new 30–45s report when provider capacity/quota permits, checks narration/scene completeness and confirms before any merge or production promotion. This implementation cannot create extra free provider quota.

## Follow-up: model-specific waits (a2)

Live diagnosis showed a 3.6 Flash 429 with an explicit 20 requests/day Free Tier quota and a ~10h Retry-After. The previous backend carried the maximum wait into a 3.8 fallback timeout/overload, incorrectly locking the whole logical operation. The new dev-only router records each model's status, scope and cooldown, skips a held model, and returns the earliest eligible model wait. A project-wide/unknown-scope 429 still blocks all alternatives; its Retry-After is not shortened. Model-specific scope requires quota dimensions or an explicit provider message naming that model.

Planner fallback is now 3.5 Flash-Lite; media review fallback remains 3.8 Flash. A live probe of 2.5 Flash returned 404 (unavailable to new users), so that model was removed rather than shipped as a working fallback. No paid model, new provider, or key rotation was introduced.

The a2 browser migrates only legacy plan/review/alignment/transcription timeout/overload waits from the known aggregation bug: the original 3.6 deadline remains a model cooldown while the alternative can be checked. It does not clear studio hourly limits or confirmed quota errors. Restore no longer checks every unrelated saved stage before returning access to the material; the individual API operation enforces its own wait.
