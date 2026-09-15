const TEST_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite"
];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/gemini-test") {
      if (!env.GEMINI_API_KEY) {
        return jsonResponse(
          {
            error: "GEMINI_API_KEY is not configured."
          },
          500
        );
      }

      const results = [];

      for (const model of TEST_MODELS) {
        const started = Date.now();

        try {
          const geminiUrl =
            `https://generativelanguage.googleapis.com/v1beta/models/` +
            `${encodeURIComponent(model)}:generateContent?key=` +
            `${encodeURIComponent(env.GEMINI_API_KEY)}`;

          const response = await fetch(
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
                        text: "Reply with exactly: TEST_OK"
                      }
                    ]
                  }
                ]
              })
            }
          );

          let data = {};

          try {
            data = await response.json();
          } catch {
            data = {};
          }

          results.push({
            model,
            status: response.status,
            ok: response.ok,
            time_ms: Date.now() - started,
            error:
              data?.error?.message || null,
            response:
              data?.candidates?.[0]?.content
                ?.parts?.[0]?.text || null
          });
        } catch (error) {
          results.push({
            model,
            status: 0,
            ok: false,
            time_ms: Date.now() - started,
            error:
              error?.message ||
              "Request failed",
            response: null
          });
        }
      }

      return jsonResponse({
        test: "Alnuqta Gemini model availability",
        timestamp: new Date().toISOString(),
        results
      });
    }

    return env.ASSETS.fetch(request);
  }
};
