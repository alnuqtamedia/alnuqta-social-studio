# Durable production worker — deployment candidate

This is a separate owner-only container service, not a patch to a single video.
Do not enable it on the public studio until a persistent host is configured and
live-provider acceptance tests pass. No infrastructure was purchased or provisioned.
The existing website/renderer is retained; the worker runs it in server Chromium,
uses native FFmpeg, and stores its own private job files on a persistent volume.
It is not a Vercel static deployment or a Supabase Edge rendering function.

## Scope and architecture

`POST /v1/jobs` → durable private job JSON → single background worker →
plan checkpoint → approved/downloaded media checkpoint → voice checkpoint →
server Chromium capture → native FFmpeg → independent ffprobe → authenticated MP4.

`public/scene-contract.js` stores explicit evidence intent; planning, project
normalization and media acquisition preserve it. The planner schema/prompt change
in `supabase/functions/gemini-studio-preview/index.ts` needs its own service deploy;
merging the file does not update Supabase automatically.

The background link is hidden unless `STUDIO_BACKGROUND_WORKER_ENABLED` is true.
The standalone `background-production.html` supports text commands, source text,
10–180 seconds, portrait/landscape, 720/1080, optional recorded audio up to20MB.
The owner enters the HTTPS worker origin and access token. Token remains in
sessionStorage, not in the repository/public configuration. Closing the caller's
page does not stop the worker. Reopening requires the token again if the session
was closed. The browser client reuses request IDs for uncertain submissions.

## Start on a trusted persistent container host

Requirements: Docker Compose, persistent disk, a TLS reverse proxy, enough memory
for Chromium and media (measure on the intended host; no capacity guarantee here).

1. Build from repository root via `production-server/compose.yml`.
2. Generate a private token (e.g. `openssl rand -hex 32`) outside the repository;
   supply `STUDIO_WORKER_TOKEN` through the host's secret/environment mechanism.
3. Run `docker compose -f production-server/compose.yml up -d --build`.
4. Keep port8080 bound to loopback as supplied. Configure HTTPS reverse proxy
   to127.0.0.1:8080. Never expose unencrypted token-bearing traffic publicly.
5. Mount/backup the named `production-jobs` volume. Without persistence, host
   replacement loses checkpoints. Do not put this directory under public webroot.
6. Set the allowed origin to the exact studio origin. Enable the frontend only
   after health, authentication and live production checks.

No auto-scaling: exactly one service process against one job directory in this
version. Multiple replicas need a transactional queue/lease store first. A server
restart recovers running jobs as queued and skips completed stages. The stage
interrupted during a crash can repeat. A checkpoint is a stage-level transaction,
not a guarantee of exactly-once remote billing within an interrupted request.

## Error handling and limits

- One active job, maximum10 queued/running/waiting jobs.
- Stable UUID submission keys; same content reuses its job, changed content409.
- Transient errors get at most3 stage attempts with persisted exponential delay.
- Quota, permanent and editorial failures are surfaced without blind retries.
- Approved scene progress is saved when the media stage returns incomplete.
- Successful stages and downloaded bytes survive restarts.
- Human audio is preserved; a requested duration mismatch blocks completion rather
  than cutting or speeding speech. This needs the transcript for scene timing.
- Authentication applies to jobs, status, trace and files; health contains no data.
- Media browser outbound hosts are allowlisted; remote user URLs are not accepted
  as a studio origin or arbitrary file import API.
- Each asset<=50MB and a checkpoint capture budget<=600MB. Retention is currently
  operator-managed: monitor disk, back up needed jobs and delete old job directories
  only when idle. A production multi-user system needs per-user auth and retention.
- Render is currently real-time canvas capture on the server plus native encoding;
  no3–5minute guarantee, no claim about live Gemini latency, source availability or
  automatic success of any topic. This does not create an editorial footage library.

## Validation

`node scripts/test-background-production.mjs`: disk-backed recovery, retries,
idempotency, auth/CORS/private output and disconnected submitter completion.
Adapter here is a fixture: it does not prove video quality.

`npm run build && node scripts/test-background-browser.mjs`: real Chromium adapter,
synthetic provider results and human audio, checkpoint, browser restart, native
FFmpeg MP4, audio/video/duration probe, no repeated research on restored render.

`npm test`: existing studio regression suite plus durable job tests.

Before enabling: run actual political, local Iraqi, economic, historical,
intentional infographic, human VO and generated VO cases. Record provider requests,
latency, approved coverage, editorial errors, audio completeness and total time.
Closing the caller must not stop the job. Stop/restart the container mid-stage and
verify the last completed stage is not run again. Test quota/network failures.
Inspect output frames and speech manually as well as ffprobe.

## Rollout / rollback

Keep the new mode off until the host is ready. No existing saved-project database
is migrated or deleted. No newsroom/auth/Meta changes. Revert this PR to restore
previous planning/controller behavior; stop the new container to disable new jobs.
Stopping does not delete the volume. Do not merge this deployment candidate solely
because synthetic tests pass: host provisioning and live acceptance remain required.
