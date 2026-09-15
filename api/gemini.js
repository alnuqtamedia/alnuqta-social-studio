const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
];

const MAX_RETRIES_PER_MODEL = 2;

const SYSTEM_PROMPT = `
أنت Gemini، مساعد الإنتاج الإبداعي والمدير الفني داخل استوديو النقطة Media.

مهمتك فهم أمر المستخدم وتنفيذ التحويل المطلوب على المحتوى الحالي.

يمكن للمستخدم أن يطلب:
- توليد خبر
- تحويل المحتوى إلى Carousel
- تحويله إلى Slides
- تحويله إلى Story
- تحويله إلى TikTok
- تحويله إلى فيديو
- إعداد نسخة لمنصة اجتماعية معينة
- إعادة صياغة المحتوى مع الحفاظ على الحقائق
- توزيع المحتوى على قوالب الاستوديو

قواعد مهمة:
1. لا تخترع حقائق أو أرقامًا أو أسماء أو اقتباسات أو مصادر أو أحداثًا.
2. حافظ على المعلومات الموجودة في المحتوى الحالي.
3. لا تغيّر المعنى الصحفي للمحتوى.
4. إذا كان المطلوب تحويلًا بصريًا، لا تكتفِ بكتابة نص؛ أعطِ بنية جاهزة للقالب.
5. اجعل النصوص عربية واضحة ومباشرة ومناسبة للسوشيال ميديا.
6. لا تضف مقدمات أو شرحًا خارج البنية المطلوبة.
7. أعد JSON صالحًا فقط.
`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    action: {
      type: "string",
    },
    outputType: {
      type: "string",
    },
    title: {
      type: "string",
    },
    subtitle: {
      type: "string",
    },
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
          },
          header: {
            type: "string",
          },
          title: {
            type: "string",
          },
          subtitle: {
            type: "string",
          },
          points: {
            type: "array",
            items: {
              type: "string",
            },
          },
          q1: {
            type: "string",
          },
          q2: {
            type: "string",
          },
          stats: {
            type: "array",
            items: {
              type: "object",
              properties: {
                value: {
                  type: "string",
                },
                label: {
                  type: "string",
                },
              },
            },
          },
          steps: {
            type: "array",
            items: {
              type: "string",
            },
          },
          cta: {
            type: "string",
          },
          handle: {
            type: "string",
          },
        },
      },
    },
  },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status) {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

async function callGemini({
  apiKey,
  model,
  command,
  currentContent,
}) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent` +
    `?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    systemInstruction: {
      parts: [
        {
          text: SYSTEM_PROMPT,
        },
      ],
    },

    contents: [
      {
        role: "user",
        parts: [
          {
            text: JSON.stringify({
              command,
              currentContent,
            }),
          },
        ],
      },
    ],

    generationConfig: {
      temperature: 0.35,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      error: {
        message: text || "Invalid Gemini response",
      },
    };
  }

  if (!response.ok) {
    const error = new Error(
      data?.error?.message ||
      `Gemini request failed with status ${response.status}`
    );

    error.status = response.status;
    error.retryable = isRetryable(response.status);

    throw error;
  }

  const generatedText =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

  if (!generatedText) {
    throw new Error("Gemini returned an empty response.");
  }

  let result;

  try {
    result = JSON.parse(generatedText);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }

  return result;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured.",
    });
  }

  const body = req.body || {};

  const command =
    typeof body.command === "string"
      ? body.command.trim()
      : "";

  const currentContent =
    body.currentContent && typeof body.currentContent === "object"
      ? body.currentContent
      : {};

  if (!command) {
    return res.status(400).json({
      error: "Command is required.",
    });
  }

  const errors = [];

  for (const model of MODELS) {
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const result = await callGemini({
          apiKey,
          model,
          command,
          currentContent,
        });

        return res.status(200).json({
          ...result,
          _model: model,
        });
      } catch (error) {
        errors.push({
          model,
          attempt,
          status: error.status || null,
          message: error.message,
        });

        if (!error.retryable) {
          break;
        }

        if (attempt < MAX_RETRIES_PER_MODEL) {
          await sleep(700 * attempt);
        }
      }
    }
  }

  return res.status(503).json({
    error: "Gemini is temporarily unavailable.",
    message:
      "All configured Gemini models failed after retries.",
    models_tried: MODELS,
    details: errors,
  });
}
