const MODEL_DEFAULT = "gemini-3.8-flash";

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
You are the AI creative director and production assistant inside Alnuqta Media's independent social-media design studio.

Your job is to execute the user's command precisely on the current content.

IMPORTANT RULES:
- Do not change the visual identity of the studio.
- Do not invent journalistic facts.
- Do not invent numbers, events, quotes, sources, names, or claims.
- If transforming existing content, preserve its facts and basic meaning.
- If generating content from only a topic, create a clear editorial draft without fabricated specifics.
- Return concise Arabic content.
- Organize the result so it can be placed directly into the studio's existing templates.
- Follow the requested output type exactly whenever possible.

Supported output types:
- carousel
- story
- reel
- video
- tiktok
- post
- youtube_thumbnail
- multi_platform

Supported slide types:
- cover
- content
- verdict
- quotes
- stats
- diagram
- outro

For multi_platform:
Return a useful content structure that the studio can directly adapt for each requested social platform.

The user may give commands such as:
- ولد لي خبر عن ...
- حوّله إلى سلايدات
- حوّله إلى Carousel
- حوّله إلى Story
- حوّله إلى فيديو
- حوّله إلى فيديو تيك توك
- سوّيلي منه نسخة إنستغرام وفيسبوك ويوتيوب شورتس

Always prioritize the user's requested transformation and output format.
`;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      url.pathname === "/api/gemini" ||
      url.pathname === "/.netlify/functions/gemini"
    ) {
      if (request.method !== "POST") {
        return jsonResponse(
          { error: "Method not allowed" },
          405
        );
      }

      if (!env.GEMINI_API_KEY) {
        return jsonResponse(
          { error: "GEMINI_API_KEY is not configured." },
          500
        );
      }

      try {
        const body = await request.json();

        const command = String(body.command || "").trim();
        const currentContent = body.currentContent || {};

        if (!command) {
          return jsonResponse(
            { error: "command is required" },
            400
          );
        }

        const model =
          env.GEMINI_MODEL || MODEL_DEFAULT;

        const prompt = `${SYSTEM}

CURRENT STUDIO CONTENT:
${JSON.stringify(currentContent, null, 2)}

USER COMMAND:
${command}`;

        const geminiUrl =
          `https://generativelanguage.googleapis.com/v1beta/models/` +
          `${encodeURIComponent(model)}:generateContent?key=` +
          `${encodeURIComponent(env.GEMINI_API_KEY)}`;

        const geminiResponse = await fetch(
          geminiUrl,
          {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: prompt
                    }
                  ]
                }
              ],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema
              }
            })
          }
        );

        const data =
          await geminiResponse.json();

        if (!geminiResponse.ok) {
          const message =
            data?.error?.message ||
            "Gemini request failed";

          return jsonResponse(
            { error: message },
            geminiResponse.status
          );
        }

        const text =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ||
          "{}";

        let result;

        try {
          result = JSON.parse(text);
        } catch {
          return jsonResponse(
            {
              error:
                "Gemini returned invalid JSON."
            },
            502
          );
        }

        return jsonResponse(result);
      } catch (error) {
        return jsonResponse(
          {
            error:
              error?.message ||
              "Gemini request failed"
          },
          500
        );
      }
    }

    return env.ASSETS.fetch(request);
  }
};
