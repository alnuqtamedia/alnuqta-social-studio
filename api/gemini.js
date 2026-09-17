import { GoogleGenAI } from "@google/genai";

const MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"
];

const responseSchema = {
  type: "object",
  properties: {
    action: { type: "string" },
    outputType: { type: "string" },
    title: { type: "string" },
    subtitle: { type: "string" },
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          header: { type: "string" },
          title: { type: "string" },
          subtitle: { type: "string" },
          points: { type: "array", items: { type: "string" } },
          q1: { type: "string" },
          q2: { type: "string" },
          stats: { type: "array", items: { type: "string" } },
          steps: { type: "array", items: { type: "string" } },
          cta: { type: "string" },
          handle: { type: "string" }
        },
        required: ["type"]
      }
    }
  },
  required: ["action", "outputType", "slides"]
};

const SYSTEM = `
You are the AI creative director and production assistant inside Alnuqta Media's independent social-media design studio.
Understand the user's natural-language command and execute it on the current studio content.
Supported output types: carousel, story, reel, video, tiktok, post, youtube_thumbnail, multi_platform.
Supported slide types: cover, content, verdict, quotes, stats, diagram, outro.
Preserve supplied facts. Never invent journalistic facts, numbers, events, quotations, or sources.
If transforming existing content, preserve its basic meaning. Do not change the visual identity or design system.
Return concise Arabic content suitable for direct placement into the studio's existing templates.
Follow the requested output type exactly.
`;

function send(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.end(JSON.stringify(body));
}

function isRetryableError(error) {
  const status = error?.status || error?.code || error?.response?.status || 0;
  return [429, 500, 502, 503, 504].includes(Number(status));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.end();
  }

  if (req.method === "GET") {
    return send(res, 200, {
      ok: true,
      service: "alnuqta-social-studio-gemini",
      apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      model: MODELS[0]
    });
  }

  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return send(res, 500, {
      error: "GEMINI_API_KEY is not configured on Vercel."
    });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const command = String(body.command || "").trim();
    const currentContent = body.currentContent || {};

    if (!command) return send(res, 400, { error: "command is required" });

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `${SYSTEM}\n\nCURRENT STUDIO CONTENT:\n${JSON.stringify(currentContent, null, 2)}\n\nUSER COMMAND:\n${command}`;
    let lastError = null;

    for (const model of MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema,
              temperature: 0.35,
              maxOutputTokens: 6000
            }
          });

          const text = response?.text || "{}";
          let result;
          try {
            result = JSON.parse(text);
          } catch {
            return send(res, 502, { error: "Gemini returned invalid JSON.", model });
          }

          return send(res, 200, { ...result, _model: model });
        } catch (error) {
          lastError = error;
          if (!isRetryableError(error)) break;
          await new Promise((resolve) => setTimeout(resolve, 800 * Math.pow(2, attempt)));
        }
      }
    }

    console.error("Gemini request failed:", lastError);
    return send(res, 503, {
      error: "Gemini service is temporarily unavailable.",
      details: lastError?.message || "Unknown Gemini error"
    });
  } catch (error) {
    console.error("API handler error:", error);
    return send(res, 500, { error: error?.message || "Gemini request failed" });
  }
}
