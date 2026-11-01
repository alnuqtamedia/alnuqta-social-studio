# Editorial context and media transfer — 1 November 2026

The earlier recovery patch still searched generic people/setting queries without a country, applied report countries to every scene, and reused identical cached queries across countries. Cache transfers were serial across scenes.

Changes:
- Scene country takes precedence over report context. Supported detection now covers Iraq, Egypt, Canada, China, United States and United Kingdom, including listed city aliases. This is a bounded detector, not universal geographic inference.
- People and setting searches start with the single scene country; generic object close-ups remain unconstrained. The review request includes the scene country. Model rules require action/context relevance and prohibit inferring nationality from skin color.
- Cached generic assets are scoped to scene-country context; old unscoped cache cannot populate country-specific scenes. Country scope is a retrieval restriction, never evidence of the asset location.
- Reviewed transfers run with three bounded scene workers and reserve asset IDs before awaits. Specific documents/events still require actual evidence; no graphic replacement or fabricated country confirmation.
- Planning rules prefer concrete filmable details and distinguish narrative geography from a request for an original artifact.

Verification: full npm test suite; added comparison, country-scoped cache, neutral-object and bounded-transfer regressions. Browser cache test verifies actual IndexedDB persistence/reload and rejects reuse in Canada for an Iraq-context asset. Tests with fixture media do not prove live visual judgment or guarantee arbitrary reports complete. No new provider or arbitrary internet downloader was added.
