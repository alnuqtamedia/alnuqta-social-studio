import { GoogleGenAI } from "@google/genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

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
          q1: { type: "string" }, q2: { type: "string" },
          stats: { type: "array", items: { type: "string" } },
          steps: { type: "array", items: { type: "string" } },
          cta: { type: "string" }, handle: { type: "string" }
        },
        required: ["type"]
      }
    }
  },
  required: ["action", "outputType", "slides"]
};

const SYSTEM = `You are the AI creative director and production assistant inside Alnuqta Media's independent social-media design studio.
Execute the user's command precisely on the current content. Do not change the visual identity or invent journalistic facts, numbers, events, quotes, sources, or claims.
If transforming existing content, preserve its facts and basic meaning. If generating from a topic, create a clear editorial draft without fabricated specifics.
Return concise Arabic content organized for direct placement into the studio's existing templates.
Supported output types: carousel, story, reel, video, tiktok, post, youtube_thumbnail, multi_platform.
Supported slide types: cover, content, verdict, quotes, stats, diagram, outro.
For multi_platform, return a useful slide/content structure that the studio can directly adapt for each requested platform.`;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export default async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  if (!process.env.GEMINI_API_KEY) return send(res, 500, { error: "GEMINI_API_KEY is not configured." });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const command = String(body.command || "").trim();
    const currentContent = body.currentContent || {};
    if (!command) return send(res, 400, { error: "command is required" });

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = `${SYSTEM}\n\nCURRENT STUDIO CONTENT:\n${JSON.stringify(currentContent, null, 2)}\n\nUSER COMMAND:\n${command}`;
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema }
    });
    const text = response.text || "{}";
    return send(res, 200, JSON.parse(text));
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: error?.message || "Gemini request failed" });
  }
};
