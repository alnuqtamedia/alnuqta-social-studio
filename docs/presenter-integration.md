# Presenter integration — activation pending

The bulletin editor uses `/api/presenter` on the same Vercel origin. It no longer requires Canva. Existing MP4/ZIP import remains available. A dated, unsubmitted first-bulletin draft is available via an explicit button.

Server-only environment variables:

- `HEYGEN_API_KEY`: create a scoped provider key in the provider dashboard; add it directly in Vercel as Sensitive. Never paste it into chat or the browser application.
- `STUDIO_PRESENTER_ACCESS_TOKEN`: a long random owner-only operation code; set as Sensitive in Vercel. Enter this code in the studio password field; it stays in memory, not browser storage.
- `HEYGEN_PRESENTER_IMAGE_URL`: the approved still; deployed path `/public/presenter-reference.jpg` on the studio origin.
- `HEYGEN_VOICE_ID`: proposed Arabic female voice Lamia, `033e70e372284077883e538608b65b69`, discovered from the connected provider catalog. Actual pronunciation and identity motion must pass a short live test before editorial production.

Redeploy after setting variables. GET `/api/presenter` reports configuration readiness only; it does not prove valid credit, no watermark, voice quality, CORS download, or successful rendering.

The owner authorizes each generation by clicking its button. The server uses v3 type=image generation with original background and speed 1.0. Provider credentials never enter client code. Signed receipts limit status access to jobs this endpoint created. Pending jobs and original wording survive refresh; this browser persistence does not synchronize devices. The first activation still needs a live test of public asset retrieval, credit, generated video download, sidecar SRT, and assembly/export. No paid production has run.

No automatic POST retries. An uncertain submission stays locked and must be reconciled in the provider request log before submitting again. Client-side locking is not distributed exactly-once delivery; durable request-id storage and per-user quotas are required before granting access beyond the owner. This is an owner-only first integration, not a multi-user billing service.

Verification: `node scripts/test-presenter.mjs`; existing newsroom checks: `node scripts/test-newsroom.mjs`.

Official v3 schema: https://developers.heygen.com/image-to-video and https://developers.heygen.com/reference/create-video . Billing: https://help.heygen.com/en/articles/10060327-heygen-api-pricing-credits-explained .

First bulletin editorial sources, checked 6 November 2026:
- https://ninanews.com/website/News/Details?Key=1324058 — government aviation denial.
- https://964media.com/733586/ — civil aviation statement.
- https://video-agencyia.iq/Detail/45950 — Sadr statement; corroboration https://baghdadtoday.news/307136-.html .

These are dated news claims; refresh sources before publishing on another day. The draft does not assert that generated footage depicts real events.
