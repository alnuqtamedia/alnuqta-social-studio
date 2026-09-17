// Vercel static frontend entry placeholder.
// The actual Gemini API is handled by /api/gemini.js.
// This file must not use Cloudflare's env.ASSETS.fetch().

export default function handler(req, res) {
  res.status(404).json({
    error: "This endpoint is not used by the Alnuqta Social Studio frontend."
  });
}
