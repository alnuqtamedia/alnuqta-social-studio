# Visual scenes and local MP4 export

## Shipped integrations

- Lottie Web 5.13.0 (MIT), loaded from the local build, renders original Alnuqta
  vector compositions. Seven topic presets: traffic, public transport, finance,
  markets, industry, environment and a general process illustration. Seek uses
  explicit frame time; no independent playback clock is used during capture.
- FFmpeg.wasm wrapper 0.12.15 and single-thread core 0.12.10 load only when
  the user selects **إصلاح التزامن / تصدير MP4** after creating a preview.
  A new offline mix contains the full original narration, music and effects.
  Video timestamps are reset and encoded to H.264/yuv420p, AAC audio and
  faststart MP4. The last picture is padded if necessary; speech is never
  shortened to make the capture fit. A fresh duration check must pass before
  downloading. The original preview remains available if processing fails.
- Existing MIT GL Transitions Canvas adaptations remain in the capture path.

## Geography

New production infers a conservative Iraq/Egypt policy from the source, command
and scene narration. Stock query terms are prefixed with the country, but search
terms and model verdicts do not establish provenance. Unverified stock is
rejected for these localized reports; local editor uploads are preserved.
When no appropriate footage exists, the renderer selects an explicitly labelled
illustration. It does not claim to be a recording of Baghdad or Cairo.
This intentionally favors graphic scenes over plausible but unverified footage.
Reports about other countries currently use the existing visual-review policy.
Documents, portraits and source-backed creative overlays retain their material
requirements; illustrations cannot replace evidence.

## Limits and deferred tools

This is not integration of every listed standalone program. Motion Canvas and
Editly would require another project compiler/render architecture. Whisper.cpp
would require a model download/runtime and is not needed for this visual fix.
Shotcut remains an external editor. None is presented as installed here.
No new server, provider, subscription, key, database schema or automatic publishing
is introduced. Existing snapshots are not migrated or deleted.

The browser FFmpeg core is around 32 MB and runs on the user's CPU. 720p is the
default and recommended on older Intel Macs. Input captures above 180 MiB are
rejected with instructions to use lower resolution. Long videos can still exhaust
available memory; cancellation terminates the worker. This is a local exporter,
not a promise of unlimited free cloud rendering.

## Verification

Unit checks cover country policy, rejected location guesses, illustration themes
and preservation of evidence requirements. Browser tests exercise actual Lottie
frame changes, graphic correction without another planner call, localized stock
rejection, MP4 finalization, and ffprobe duration/audio checks. Existing production
and export regression suites must also pass.
