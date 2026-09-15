const MODEL_DEFAULT = "gemini-3.8-flash";

const FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
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

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders
    }
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function containsFallbackMessage(value) {
  const text = String(value || "").toLowerCase();

  const fallbackPhrases = [
    "high demand",
    "spikes in demand",
    "try again later",
    "temporarily unavailable",
    "service unavailable",
    "resource exhausted",
    "rate limit",
    "rate_limit",
    "overloaded",
    "model is currently experiencing",
    "currently experiencing high demand",
    "please try again later"
  ];

  return fallbackPhrases.some((phrase) =>
    text.includes(phrase)
  );
}

function shouldFallback(status, data, message = "") {
  if (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return true;
  }

  const serializedData = JSON.stringify(data || {});

  return (
    containsFallbackMessage(message) ||
    containsFallbackMessage(serializedData)
  );
}

function extractGeminiText(data) {
  const parts =
    data?.candidates?.[0]?.content?.parts || [];

  return parts
    .map((part) => part?.text || "")
    .join("\n")
    .trim();
}

function getGeminiErrorMessage(data) {
  return (
    data?.error?.message ||
    data?.message ||
    extractGeminiText(data) ||
    "Gemini request failed"
  );
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
          {
            error:
              "GEMINI_API_KEY is not configured."
          },
          500
        );
      }

      try {
        const body = await request.json();

        const command = String(
          body.command || ""
        ).trim();

        const currentContent =
          body.currentContent || {};

        if (!command) {
          return jsonResponse(
            {
              error: "command is required"
            },
            400
          );
        }

        const configuredModel =
          String(
            env.GEMINI_MODEL ||
              MODEL_DEFAULT
          ).trim();

        const models = [
          configuredModel,
          ...FALLBACK_MODELS
        ].filter(
          (model, index, array) =>
            model &&
            array.indexOf(model) === index
        );

        const prompt = `${SYSTEM}

CURRENT STUDIO CONTENT:
${JSON.stringify(
  currentContent,
  null,
  2
)}

USER COMMAND:
${command}`;

        let lastError =
          "Gemini request failed";

        let lastStatus = 503;

        for (
          let modelIndex = 0;
          modelIndex < models.length;
          modelIndex++
        ) {
          const model = models[modelIndex];

          try {
            const geminiUrl =
              `https://generativelanguage.googleapis.com/v1beta/models/` +
              `${encodeURIComponent(
                model
              )}:generateContent?key=` +
              `${encodeURIComponent(
                env.GEMINI_API_KEY
              )}`;

            const geminiResponse =
              await fetch(
                geminiUrl,
                {
                  method: "POST",
                  headers: {
                    "content-type":
                      "application/json"
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
                      responseMimeType:
                        "application/json",
                      responseSchema
                    }
                  })
                }
              );

            let data = {};

            try {
              data =
                await geminiResponse.json();
            } catch {
              data = {};
            }

            const message =
              getGeminiErrorMessage(data);

            lastError = message;
            lastStatus =
              geminiResponse.status || 503;

            /*
             * IMPORTANT:
             * Gemini can sometimes return the
             * "high demand" message inside the
             * response even when the HTTP status
             * does not clearly indicate a failure.
             *
             * So we inspect the actual response
             * body before deciding whether to stop.
             */

            const needsFallback =
              shouldFallback(
                geminiResponse.status,
                data,
                message
              );

            if (
              !geminiResponse.ok ||
              needsFallback
            ) {
              if (
                modelIndex <
                models.length - 1
              ) {
                await sleep(700);
                continue;
              }

              return jsonResponse(
                {
                  error: message,
                  model,
                  fallbackExhausted:
                    true
                },
                lastStatus >= 400
                  ? lastStatus
                  : 503
              );
            }

            const text =
              extractGeminiText(data);

            if (!text) {
              lastError =
                "Gemini returned an empty response.";

              if (
                modelIndex <
                models.length - 1
              ) {
                await sleep(500);
                continue;
              }

              return jsonResponse(
                {
                  error: lastError,
                  model
                },
                502
              );
            }

            /*
             * Check the returned text itself.
             * This catches cases where Gemini returns
             * the high-demand message as normal text.
             */

            if (
              containsFallbackMessage(text)
            ) {
              lastError = text;

              if (
                modelIndex <
                models.length - 1
              ) {
                await sleep(700);
                continue;
              }

              return jsonResponse(
                {
                  error: lastError,
                  model,
                  fallbackExhausted:
                    true
                },
                503
              );
            }

            let result;

            try {
              result = JSON.parse(text);
            } catch {
              lastError =
                "Gemini returned invalid JSON.";

              if (
                modelIndex <
                models.length - 1
              ) {
                await sleep(500);
                continue;
              }

              return jsonResponse(
                {
                  error: lastError,
                  model
                },
                502
              );
            }

            /*
             * Final safety check:
             * If the parsed JSON itself contains
             * a high-demand message, fallback.
             */

            if (
              containsFallbackMessage(
                JSON.stringify(result)
              )
            ) {
              lastError =
                "Gemini model is currently under high demand.";

              if (
                modelIndex <
                models.length - 1
              ) {
                await sleep(700);
                continue;
              }

              return jsonResponse(
                {
                  error: lastError,
                  model,
                  fallbackExhausted:
                    true
                },
                503
              );
            }

            /*
             * SUCCESS
             *
             * Return the AI result exactly as before.
             * Add the model only as a response header
             * so the frontend does not need to change.
             */

            return jsonResponse(
              result,
              200,
              {
                "x-gemini-model": model
              }
            );
          } catch (error) {
            lastError =
              error?.message ||
              "Gemini request failed";

            lastStatus = 503;

            if (
              modelIndex <
              models.length - 1
            ) {
              await sleep(700);
              continue;
            }
          }
        }

        return jsonResponse(
          {
            error: lastError,
            fallbackExhausted: true
          },
          lastStatus >= 400
            ? lastStatus
            : 503
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
