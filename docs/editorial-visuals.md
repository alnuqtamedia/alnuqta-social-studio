# Editorial visual selection

Country-sensitive projects search Wikimedia Commons rather than accepting generic Pexels footage as local documentation. Country detection covers the names registered in production-core.js. City and exact ministry constraints currently include Iraqi cities, Cairo/Alexandria, and four ministry names; other named people/documents use the supplied visual query as an exact metadata constraint. This is conservative matching, not universal entity recognition.

Commons metadata must match the country and any city/entity constraint. Automatic licences are public domain, CC0 and CC BY, with source/creator/licence/date retained. CC BY-SA, NC, ND, restrictions and unknown licences are excluded. Pre-2000 imagery and historic maps are excluded from contemporary automatic selection. Additional recognizable foreign locations and unrelated military imagery are rejected. Metadata is not independent verification; Gemini reviews the thumbnail, not every video frame. Unknown dates remain unknown.

Video exports using CC BY are ZIP bundles containing the reviewed video and publish-description-credits.txt. That attribution must accompany publication. Archive footage/images receive an archive/date label; they must not be presented as footage of the current event or evidence of a person's poverty. Photo-only results are reported honestly.

Country visual corrections such as “بدّل المشاهد إلى مشاهد عراقية” bypass the text planner and preserve narration. They clear both mediaItems and legacy mediaUrl/mediaVideoUrl. Previous assets remain in previousMediaItems; missing local alternatives are reported and not silently replaced by foreign assets. Ordinary non-country corrections retain transactional behaviour.

No Google or YouTube scraping, arbitrary URL downloading, paid service, key change, permanent media storage or direct publishing was added. Websites and ministries are not presumed to grant reuse permission. Existing manual uploads remain available. Gemini/Commons availability and the existing function limits still apply.

Validation: npm test includes country/city/entity constraints, foreign maps, licences, URL safety and replacement of legacy media without a text-planner/voice request. Live searches and thumbnail review must additionally be checked after deployment.
