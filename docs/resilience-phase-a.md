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
