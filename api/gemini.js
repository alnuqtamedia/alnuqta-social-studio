```javascript
import { GoogleGenAI } from "@google/genai";

const MODELS = [
  process.env.GEMINI_MODEL || "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
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
          points: {
            type: "array",
            items: { type: "string" }
          },
          q1: { type: "string" },
          q2: { type: "string" },
          stats: {
            type: "array",
            items: { type: "string" }
          },
          steps: {
            type: "array",
            items: { type: "string" }
          },
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
You are the AI creative director and production assistant inside
Alnuqta Media's independent social-media design studio.

Your job is to understand the user's natural-language command and execute
it on the current studio content.

The user may ask you to:
- generate content
- transform existing content
- create a carousel
- create slides
- create a story
- create a reel
- create a video
- create a TikTok video
- create a social post
- create a YouTube thumbnail
- create content for multiple platforms

Supported output types:
carousel, story, reel, video, tiktok, post,
youtube_thumbnail, multi_platform.

Supported slide types:
cover, content, verdict, quotes, stats, diagram, outro.

IMPORTANT EDITORIAL RULES:
- Preserve facts from the supplied current content.
- Never invent journalistic facts.
- Never invent numbers or statistics.
- Never invent events.
- Never invent quotations.
- Never invent sources.
- Never present an unverified claim as established fact.
- If the user asks to transform existing content, preserve its basic meaning.
- Do not change the visual identity or design system.
- Return concise Arabic content suitable for direct placement into the
  studio's existing templates.
- Follow the user's requested output type exactly.
- Do not add unnecessary explanations outside the requested content.

For multi_platform, structure the response so the studio can directly
adapt the content to the requested platforms.
`;

function send(res, status, body) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(body));
}

function isRetryableError(error) {
  const status =
    error?.status ||
    error?.code ||
    error?.response?.status ||
    0;

  return [429, 500, 502, 503, 504].includes(Number(status));
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.end();
  }

  if (req.method !== "POST") {
    return send(res, 405, {
      error: "Method not allowed"
    });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return send(res, 500, {
      error: "GEMINI_API_KEY is not configured."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : (req.body || {});

    const command = String(body.command || "").trim();
    const currentContent = body.currentContent || {};

    if (!command) {
      return send(res, 400, {
        error: "command is required"
      });
    }

    const ai = new GoogleGenAI({
      apiKey
    });

    const prompt = `
${SYSTEM}

CURRENT STUDIO CONTENT:
${JSON.stringify(currentContent, null, 2)}

USER COMMAND:
${command}
`;

    let lastError = null;

    for (const model of MODELS) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema
            }
          });

          const text = response?.text || "{}";

          let result;

          try {
            result = JSON.parse(text);
          } catch {
            return send(res, 502, {
              error: "Gemini returned invalid JSON.",
              model
            });
          }

          return send(res, 200, {
            ...result,
            _model: model
          });
        } catch (error) {
          lastError = error;

          if (!isRetryableError(error)) {
            break;
          }

          const delay = 800 * Math.pow(2, attempt);
          await new Promise((resolve) =>
            setTimeout(resolve, delay)
          );
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

    return send(res, 500, {
      error: error?.message || "Gemini request failed"
    });
  }
}
```
