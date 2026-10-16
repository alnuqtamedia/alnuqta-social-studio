# Motion overlays and duration acceptance

Scope: general studio production. Do not re-edit the user's money-laundering video. Existing TTS provider/model selection, media search/adoption, decoding, clip cycling, recording and saved project IDs remain unchanged.

## Changes

- Independent local canvas module for animated titles, phrase subtitles, source-anchored subject icons, concept cards and literal-number data cards. Works in portrait and landscape. No network calls or generated statistics.
- Optional planner graphics annotations must quote their label and anchor from narration; invalid annotations fall back to a local subject dictionary. Existing projects need no migration.
- Add one enabled checkbox; changing it invalidates the preview. The setting is included in new local snapshots. Legacy static drawing remains available.
- Scene-local audio timeline time now drives overlays in both normal rendering and transitions. The existing voice and clip playback chain is retained.
- Subtitle phrase/word timing is estimated inside each scene, not word-level forced alignment. Icons are illustrative, not evidence of identity or wrongdoing.
- Explicit command duration selects fitting mode and supplies a total narration budget. Oversized narration is edited before the first speech request; source material is retained.
- Narration asks the existing voice for a natural reading near the target. Existing measured fitting remains bounded. No audio speed changes or speech clipping.
- Export acceptance now requires both audio/video synchronization and target-duration tolerance in fitting mode. Preview remains visible when outside tolerance; mismatch is not falsely labeled successful. This does not guarantee provider availability or exact speech generation on every request.

## Verification

Full npm test and build pass, including source-anchored graphics, phrase text completeness, distinct animated frames, landscape rendering, literal numeric data, source immutability, pre-speech budget, explicit duration mode and rejection of a 115-second file for a 60-second request. Local canvas renders inspected on manufacturing, education/water/energy and financial examples. Existing post/carousel and continuous narration regressions pass.

## Rollback

Source: backup/pre-motion-20261016 at 0d137c4124966801b737f1afba8dc02f76be141c. Previous live planner v23 bundle: docs/pre-motion-planner-20261016.json. Preserve verify_jwt=true and existing secrets. No changes to the news site, authentication, billing or direct social publishing.
