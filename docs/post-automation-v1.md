# First automated production path

This first slice accepts a design job, renders the existing Alnuqta news canvas in a hosted GitHub Actions Chromium runner, and stores the final 1080×1350 JPEG and public JSON result. It does not collect news, select topics, publish to Meta, or automate reels/carousels yet. It does not require the user's Mac or an open browser tab.

## API contract

The job ingress is GitHub's supported workflow-dispatch API, authenticated by a GitHub account/app with Actions write permission on this repository:

`POST https://api.github.com/repos/alnuqtamedia/alnuqta-social-studio/actions/workflows/render-social-post.yml/dispatches`

Body:

```json
{"ref":"main","inputs":{"design_json":"{\"jobId\":\"UNIQUE-UUID-V4\",\"headline\":\"عنوان\",\"summary\":\"ملخص\",\"imageUrl\":\"https://images.pexels.com/photos/.../photo.jpeg\",\"caption\":\"نص النشر\",\"badge\":\"خبر\",\"format\":\"feed\"}"}}
```

The dispatch response acknowledges scheduling, not completion. Monitor the GitHub workflow run; once completed, fetch:

`https://zsqvmuqlmtnhndwuqlfy.supabase.co/storage/v1/object/public/studio-automation-output/jobs/JOB-ID/result.json`

The result contains `imageUrl`, `caption`, `width`, `height`, `inputHash` and `status: completed`. Meta can fetch `imageUrl` without a browser login. Reusing a job ID for changed input is rejected. Use a new UUID for each new design. This is not an anonymous studio webhook; a future orchestrator must authorize dispatch through GitHub or a dedicated authenticated front door.

## Authentication and storage

Only GitHub-issued, RS256-verified OIDC tokens with the exact repository/owner numeric IDs, main ref, expected workflow and audience may store output. Pull-request/fork/other-workflow tokens are rejected. No service key is stored in the repo, runner, public page, or workflow inputs. `verify_jwt=false` applies only to the new upload function because it validates GitHub OIDC itself; existing endpoints are unchanged.

The dedicated public storage bucket contains final publication assets and non-secret result manifests. Existing newsroom buckets/policies are untouched. No public upload policy is added. JPEG size/dimensions and input limits are enforced server-side; only selected static media hosts can be fetched by the worker. The worker doesn't fetch arbitrary internal URLs or execute content as code. Originals on Commons still require appropriate publication attribution; the initial demo uses Pexels imagery.

## Initial test

Changing `scripts/fixtures/automation-demo.json` on main runs one clearly labelled production demo and stores its result. Other code pushes do not continually generate demo posts. Pull requests render and test locally in CI with storage upload disabled. There is no recurring schedule and no Meta publishing.

The runner uses the existing logo/colors/layout and bundled Cairo font; unsupported decorative footer emoji are omitted in the automation output to avoid missing-glyph boxes. It fails on missing imagery or text truncation rather than silently publishing an incomplete design.

## Remaining work

Choose and validate the news-source list and editorial rules; add collection/deduplication/6:4 selection; integrate the caption/asset generator with dispatch; connect the authorized Meta accounts; test one approved social post, then scheduling and retries per platform; later add carousel and video workers. Hosting and provider quotas still apply. GitHub Actions scheduling is asynchronous and not an instant render API.
