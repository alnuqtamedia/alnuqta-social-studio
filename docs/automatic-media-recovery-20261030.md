# Automatic media recovery — 30 October 2026

The studio previously stopped at the first three candidates, searched portrait-only for reels, and attached one clip per scene. Rejected stock returned the workload to the editor.

## Implemented

- Up to eight candidates, reviewed in three-thumbnail batches (at most three review batches concurrently); no unreviewed candidate is accepted.
- Up to three distinct assets for long scenes, with existing completed scenes and narration preserved.
- Bounded search recovery: requested orientation, unrestricted orientation, still-image fallback when permitted by the requested visual type, then Wikimedia Commons stills. A model-proposed alternative query is used once for a rejected general illustration. Strict video requests stay video.
- Coalesce three searches into one authenticated, origin-checked Edge request. The existing hourly rate-limit settings are unchanged; upstream requests remain bounded. Single-query requests remain backward compatible.
- Commons uses a fixed API host and a conservative CC0/public-domain image subset. It does not infer verified geography from search text, captions, or visual resemblance. No YouTube scraper, arbitrary URL proxy or new API secret.
- Accepted generic illustrations download into the existing device-local IndexedDB library (50MB/file, capped streaming, 20-second cache timeout). They persist across reloads and reuse the same query, with provenance and review metadata. Cache failure leaves an already decodable remote asset usable and is logged. Browser eviction/storage quotas remain possible.
- Automatically cached illustrations never acquire editor-confirmed country evidence and cannot be reused as documents or specific-event evidence. Manually reviewed library records are not overwritten by an automatic cache write.
- Cache-version update for changed browser modules and a distinct build label. Main news website, logo, saved-project schema and audio generation remain unchanged.

## Verification

- `npm test` passed, including new handler, recovery and Commons tests.
- `node scripts/test-media-cache-browser.mjs` passed in Chromium headless shell: one download, real IndexedDB persistence after reload, reuse, exclusions and event-evidence protection.
- Existing mixed-media browser export passed using `STUDIO_CHROMIUM_EXECUTABLE` pointing at Chromium headless shell. It produces and independently decodes an MP4 containing an image, moving video and intentional graphics. The normal Chromium binary could not launch in this sandbox (socket permission), so the supported headless shell was used without changing test assertions.
- One direct live Commons query (`Baghdad Tigris`) returned a public-domain archival photo. This proves the new adapter can retrieve a real source, not its suitability for a modern report.
- Search/review recovery tests use fixtures; no complete live report has yet been validated with the new Edge service and browser build together.

## Deployment and remaining limits

Deploy `backend/pexels-search-preview/index.ts` with `backend/_shared/commons-search.mjs` and the existing security dependency, retaining JWT validation, origin allowlist and rate limits. Deploy the updated `_shared/media-review.mjs` with the existing Gemini planner function, preserving its other live files. Then publish the static build. A static publish alone cannot enable the new batch endpoint/Commons review IDs.

The recovery budget stops starting further rounds after 150 seconds; this is not an absolute render deadline. Specific places, people, documents and events still require their real source. This patch does not promise arbitrary internet availability or silently convert required footage into graphics. It does not add Pixabay or a hosted archive database. A complete live report, including provider quotas and browser CORS, must pass before calling the whole production task fixed.
