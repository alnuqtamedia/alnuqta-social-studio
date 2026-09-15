const MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

const MAX_RETRIES_PER_MODEL = 2;

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
- This is an independent social-media design studio.
- Do not modify or discuss the internal Alnuqta Media website or CMS.
- Do not change the visual identity of the studio.
- Do not invent journalistic facts.
- Do not invent numbers, events, quotes, sources, names, dates, or claims.
- If transforming existing content, preserve its facts and basic meaning.
- If generating content from only a topic, create an editorial draft without presenting invented details as verified facts.
- Return concise Arabic content.
- Organize the result so it can be placed directly into the studio's existing templates.
- Follow the requested output type exactly whenever possible.
- Do not return Markdown.
- Do not explain your reasoning.
- Return only the requested structured result.

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

The user may give commands such as:
- ولد لي خبر عن ...
- حوّله إلى سلايدات
- حوّله إلى Carousel
- حوّله إلى Story
- حوّله إلى فيديو
- حوّله إلى فيديو تيك توك
- سوّيلي منه نسخة إنستغرام وفيسبوك ويوتيوب شورتس

Always prioritize the user's requested transformation and output format.

For multi_platform:
Create a practical structure that can be directly adapted for the requested platforms.

When the user asks to transform existing content:
- Keep the core facts.
- Keep important names and figures exactly as provided.
- Do not add unsupported information.
- Change only the format, structure, wording, length, or presentation needed for the requested platform.

For carousel:
Prefer a strong cover, concise content slides, and an outro/CTA.

For TikTok/Reel/video:
Structure the slides as short visual scenes suitable for video production.

For Story:
Use short, punchy frames suitable for vertical stories.

For a news/editorial topic without supplied facts:
Use careful wording such as "موضوع مقترح" or "صياغة أولية" rather than inventing factual claims.
`;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryable(status, message = "") {
  const text = String(message).toLowerCase();

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    text.includes("high demand") ||
    text.includes("temporarily unavailable") ||
    text.includes("overloaded") ||
    text.includes("service unavailable") ||
    text.includes("try again later")
  );
}

async function callGemini(model, prompt, apiKey) {
  const geminiUrl =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(model)}:generateContent?key=` +
    `${encodeURIComponent(apiKey)}`;

  const response = await fetch(geminiUrl, {
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
        responseSchema,
        temperature: 0.35
      }
    })
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  const message =
    data?.error?.message ||
    `Gemini request failed with status ${response.status}`;

  if (!response.ok) {
    const error = new Error(message);
    error.status = response.status;
    error.retryable = isRetryable(response.status, message);
    throw error;
  }

  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "";

  if (!text) {
    const error = new Error("Gemini returned an empty response.");
    error.status = 502;
    error.retryable = true;
    throw error;
  }

  let result;

  try {
    result = JSON.parse(text);
  } catch {
    const error = new Error("Gemini returned invalid JSON.");
    error.status = 502;
    error.retryable = true;
    throw error;
  }

  return result;
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
          {
            error: "Method not allowed"
          },
          405
        );
      }

      if (!env.GEMINI_API_KEY) {
        return jsonResponse(
          {
            error: "GEMINI_API_KEY is not configured."
          },
          500
        );
      }

      try {
        const body = await request.json();

        const command = String(body.command || "").trim();
        const currentContent = body.currentContent || {};

        if (!command) {
          return jsonResponse(
            {
              error: "command is required"
            },
            400
          );
        }

        const prompt = `${SYSTEM}

CURRENT STUDIO CONTENT:
${JSON.stringify(currentContent, null, 2)}

USER COMMAND:
${command}`;

        const errors = [];

        for (const model of MODELS) {
          for (
            let attempt = 0;
            attempt <= MAX_RETRIES_PER_MODEL;
            attempt++
          ) {
            try {
              const result = await callGemini(
                model,
                prompt,
                env.GEMINI_API_KEY
              );

              return jsonResponse({
                ...result,
                _model: model
              });
            } catch (error) {
              const message =
                error?.message ||
                "Gemini request failed";

              errors.push({
                model,
                attempt: attempt + 1,
                status: error?.status || 0,
                error: message
              });

              const retryable =
                error?.retryable === true;

              if (
                retryable &&
                attempt < MAX_RETRIES_PER_MODEL
              ) {
                const delay =
                  700 * Math.pow(2, attempt);

                await sleep(delay);
                continue;
              }

              break;
            }
          }
        }

        const lastError =
          errors.length > 0
            ? errors[errors.length - 1]
            : null;

        return jsonResponse(
          {
            error:
              lastError?.error ||
              "All Gemini models are currently unavailable.",
            models_tried: MODELS,
            details: errors
          },
          503
        );
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
