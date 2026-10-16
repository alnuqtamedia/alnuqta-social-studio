# Guided studio preview — a3

Requested by the owner after the a2 workflow proved too complex and Commons returned very old visuals. Scope remains the existing development preview and draft PR 6; main and all backend functions are unchanged. Backup: backup/studio-before-simple-20261015.

- Primary action: produce preview. Reuse an existing narration-ready plan for the same source; changed source/known changed command creates a new plan. Prepare media, then narration, then the actual browser-rendered preview. No automatic download or social publishing.
- Technical actions, cache status, candidate picker and legacy editors remain available in collapsed details. The source input, command, primary action, stop, new project, restore, preview and download remain accessible. Project database/version/backup import remain unchanged.
- Commons archive automatic selection requires a valid capture date within 730 days, not upload date, unknown date or future date. This recency does not mean footage of the reported event. Old external media is retained as previousMediaItems and can be explicitly allowed through the archive option; owned local media is preserved.
- Missing/rejected/unreviewed visuals fall back to local Canvas illustrations (document, privacy, work or budget) tied to exact source excerpts. They are explicitly reported as local graphics, not actual footage. They add no factual chart values, invented numbers, maps, identities or source claims. They do not require Gemini or a new provider. The option can be disabled.
- Review batches combine candidate scenes where possible; failed review cannot erase candidates. They remain in details, without forcing manual review to create a local graphic.
- Missing-media errors identify scene numbers. Audio generation still depends on the existing Gemini quota or an owner-supplied recording. No paid model, billing, new provider, persistent server upload, or security changes.

Validation: npm test includes date/ownership/source-excerpt tests and a controller test demonstrating full local visual coverage when media search fails or returns no suitable visuals, old-media preservation, no repeated searches and no review for absent candidates. Live UI/export validation is recorded in the PR. A technically rendered test with synthetic test audio is not a voice-quality or journalism-quality acceptance test.
