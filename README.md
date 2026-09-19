# Alnuqta Media — Social Design Studio + Gemini

Independent social-media design studio. It does not modify or depend on the main Alnuqta Media site.

## Netlify deployment
1. Create/import a repository containing this folder.
2. In Netlify, Add new project → Import an existing project → GitHub.
3. Build command: leave empty.
4. Publish directory: `.`
5. Functions directory: `netlify/functions` (also defined in `netlify.toml`).
6. Add environment variable `GEMINI_API_KEY` with your Google AI Studio key. Optional: `GEMINI_MODEL=gemini-3.8-flash`.
7. Deploy.

The browser calls `/.netlify/functions/gemini`; the Gemini API key stays server-side in Netlify Functions.

## Local
Install dependencies, set `GEMINI_API_KEY`, then use a Netlify-compatible local dev command such as `netlify dev`.

## Supabase Edge Function security

The live `gemini-studio`, `gemini-image`, `pexels-search`, and `gemini-tts`
functions are protected by an exact Origin allowlist and a shared server-side rate
limit. Their versioned source and database migrations live in the
[`alnuqta-media` repository](https://github.com/alnuqtamedia/alnuqta-media/tree/main/supabase).
See [the security status](docs/security-status.md).
