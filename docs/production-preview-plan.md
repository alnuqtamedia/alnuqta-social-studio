# Studio production preview: plan and acceptance

## Priority and scope

1. Protect the old release and existing saved projects. Backup branch: `backup/studio-before-production-20261010`, baseline `c41e6d0a9a6c356adb99e199afd8337d13775815`. Work only on `dev/studio-production-20261010`; main is retained.
2. Accept pasted source or selectable-text PDF. Extract locally; send source text to the existing Gemini provider only on command execution. Retain source in explicit local snapshots.
3. Accept an opt-in microphone command. Transcribe with Gemini; show editable text and require execution separately. Never execute a recording automatically.
4. Produce structured scenes or slides, fetch licensed Pexels stock with author/source/license metadata, preserve user-supplied media, and mark generic stock as illustrative. Search selection remains heuristic and needs editorial review.
5. Generate continuous narration in paragraph groups, measure the audio, distribute scene timing, retain human voice, and reject clipping or forced acceleration.
6. Render locally using actual video clips when available, portrait or landscape, titles/branding/contact fields and transitions. Measure the completed file. Use H.264 MP4 only where supported, otherwise a correctly labelled WebM.
7. New project requires confirmation and retains prior snapshots. Cancel retains prepared work. Provide a local video player for the exported file.

## Free operation and boundaries

No Cloud Run, new provider, billing activation or permanent report/video upload is introduced. Gemini and Pexels use existing credentials and quotas; free availability is limited and not guaranteed. On-device rendering consumes device memory and runs in real time; the tab must remain visible. Preview scope is 5–600 seconds, 720p by default; 1080p may be slower. PDF scope is 15 MB, 80 pages, 40,000 characters, without OCR. Voice commands are limited to 90 seconds / 4 MB. Free Gemini inputs must not contain confidential source material.

A selectable-text PDF may still have wrong reading order, especially columns and Arabic; the extracted text is shown for review. A stock license does not establish model/property releases, trademark permission or the right to depict a person as involved in an event. Do not scrape arbitrary Google Images results. No unlimited generated cinematic video is promised.

Paragraph boundaries are measured; shot boundaries inside a paragraph are approximate. An exact overall duration is not evidence of complete narration or professional editing. If voice is shorter than the video by more than five seconds, the export warns about the remaining gap. Short clips can end before a scene; this remains a production review concern, not a claim of uninterrupted footage.

## Validation evidence

- Clean install and test suite passed locally; GitHub Validate Studio passed on the preview branch.
- Schema/security/bundle checks, timeline totals and overrun rejection, number normalization, media provenance/duplicates, source clearing, reset confirmation/busy guards, brand preservation and snapshot metadata checks passed.
- Live preview requests: Gemini generated five scenes; Pexels returned eight video candidates; Gemini TTS generated PCM audio. Audio transcription returned Arabic text without executing it.
- First browser end-to-end portrait run: five actual video scenes, requested 45 seconds, measured 45.24 seconds. Saved/restored narration measured 41.670958 seconds with ffprobe. New project cleared active work and kept the saved snapshot.
- PDF browser test exposed a PDF.js 6 cleanup incompatibility; fixed by destroying the loading task. A real selectable PDF then passed local PDF.js extraction with both numeric values retained and the worker released. Browser recheck passed after the fix: the extracted text preserved 500,000 and 1520.
- Initial landscape stress export: 1280x720, requested 120 seconds, measured 120.962033 seconds, failed the 0.5-second tolerance. Codec inspection exposed VP9/Opus in generic MP4. The preview now requires H.264/AAC MP4, otherwise WebM; first frames are supplied while waiting for recorder start. Final landscape recheck passed: WebM, requested 120.00 seconds, measured 120.28 seconds. The UI explicitly warned that narration was shorter than the technical stress-test timeline. This is not a complete television report.

- Actual browser cancellation preserved the prepared project; the microphone button rejected recording until provider-transmission consent was enabled. Physical microphone capture still needs a device test.

- New-source context isolation passed a browser retest: the image post used the new source title rather than the prior report title, selected a Pexels image, credited its author and exported a PNG.

## Review gate

Keep the original live studio until preview acceptance. Before promotion, verify an Arabic report PDF and a scanned PDF rejection; actual microphone capture on the owner's device; complete two-minute narration with matching licensed footage; visual/audio quality; image post and carousel exports; mobile codec compatibility; and cancellation during generation/render. Do not describe the technical two-minute stress test with shorter narration as a complete television report.

Rollback of the application uses the saved baseline branch. Preview functions are isolated; live functions were not replaced. Saved projects remain on the browser origin where they were created; projects are not automatically transferred between the preview and production origins.
