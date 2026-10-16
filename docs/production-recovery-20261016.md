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
