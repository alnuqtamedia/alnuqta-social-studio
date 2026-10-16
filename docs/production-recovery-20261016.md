# Production recovery — 16 October 2026

Scope: existing social studio, not the news site. Keep the production interface, image/post/carousel exporters, saved project format and one continuous voice. Do not introduce Cloud Run, billing or a provider.

## Published changes

- Initial video command includes one total narration word budget derived from the requested duration; explicit durations select measured fitting mode.
- Scene geography prefers a scene's explicit country and institutions over the report-wide country. Generic conceptual shots use their own visual query instead of being forced to archive street photos.
- Preserve explicit city, portrait and institution constraints. Added tests for a loan-contract scene inside an Iraqi report, US Congress inside an Iraqi report, and Iraqi parliament.
- Retain the original production controller rather than deploying the separate guided/resume experiment. That experiment disabled duration fitting and is not part of this recovery release.
- TTS has a bounded 120-second overall budget and up to 90 seconds per model, rather than aborting every model after 38 seconds. Client TTS timeout is 130 seconds. Provider errors are distinguished from timeouts and quota failures, with the key redacted.
- Do not report missing-media production as fully complete.

## Evidence

- npm ci and npm test passed: schema, export timing, continuous narration, measured fitting, post and carousel rendering, media review, geography, and free TTS failure handling.
- GitHub Actions Validate Studio run 129 passed.
- PR 7 merged: https://github.com/alnuqtamedia/alnuqta-social-studio/pull/7
- Main merge: 8a3a0d26e69febd8ba01dfcf636478889f6a1bf7.
- Production header verified in browser: 2026-10-16-production-recovery-r1.
- TTS backend version 8 returned 336526 bytes of PCM (7.01 seconds), using gemini-2.5-flash-preview-tts and Charon. This is a short smoke test, not proof of all long-form requests.

## Rollback

- GitHub branch backup/production-main-20261016 preserves 56c1d393a01c0a0e1023cea76c92c52c1a066660.
- Previous live TTS version 7 file bundle: docs/tts-live-backup-20261016.json. Restore the three files with verify_jwt=true; do not change secrets or auth.
- No edits to the news site or saved user project records.

## Limits

No guarantee of unlimited free quota, exact-duration speech for every text, current-event footage for every event, or automatic editorial correctness. The service retains complete speech and reports an actual duration mismatch rather than cutting words. Production readiness requires a complete fresh browser test; record its result below.

## Live verification follow-up

- PR 8 / main 44a8cdb: exact country-token matching prevents التركيز from matching Turkey; normalize original Commons JPEG/PNG/WebP URLs to 330px thumbnails without broadening provider hosts or removing byte limits. Preserve live planner v17 bundle in docs/studio-live-backup-20261016.json.
- PR 9 / main d845d5d: validate measured narration word-budget output before accepting a model response, using the existing bounded fallback when unchanged/out of budget. Backend v22; JWT remains enabled. Full npm test and GitHub Actions run 133 passed.
- Fresh browser command generated three scenes with continuous Gemini voice, aligned boundaries, and automatically selected actual Pexels video clips in all three scenes. No scene lacked media.
- In this fresh test, voice was 34.25 seconds against 40 requested; fitting failed due to provider timeout. This was recorded before the latest fallback validation change. Do not report exact duration as verified.
- Local browser video preview verification is in progress. Post/carousel exporters pass automated regression checks; a fresh browser export of every format has not yet been verified in this session.

- First exported preview: WebM VP8 + Opus, 720x1280, actual 34.27s versus complete voice 34.25s. Contact sheet at 5-second intervals verified footage in all three scenes. Audio silence analysis found two natural pauses under 0.9s, no long internal gaps.
- R2 main 4d77344: natural pacing fallback for a modest measured gap and 130s original speech request timeout. Automated test verifies unchanged text and acceptance of closer measured duration. This is not proof of exact duration in live generation.
- R2 project restore succeeded with saved voice and clips. Latest production retry returned free TTS quota unavailable from Google, so live duration verification is BLOCKED; stop repeated provider calls. One-image post test generated text but visual review returned provider high-demand; full live image/post/carousel readiness is NOT verified.
- Preserve post text and route it into its template before optional media review; preparing a static design must not trigger video narration. No new providers or billing.
