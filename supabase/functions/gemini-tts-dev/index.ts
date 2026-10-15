import { apiError } from "../_shared_dev/api-errors.mjs";
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { authorizeStudioOrigin, enforceStudioRateLimit } from "../_shared_dev/studio-security.ts";

import { requestFlashSpeech } from "../_shared_dev/flash-speech.mjs";

Deno.serve(async (req: Request) => {
  const security = authorizeStudioOrigin(req);
  if (security instanceof Response) return security;
  const { cors } = security;
  const reply = (value: unknown, status = 200) => new Response(JSON.stringify(status>=400?apiError(status,value):value), { status, headers: cors });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const blocked = await enforceStudioRateLimit(req, "gemini-tts", cors);
  if (blocked) return blocked;

  try {
    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return reply({ error: "GEMINI_API_KEY غير مفعّل." }, 503);
    const body = await req.json();
    const text = String(body?.text || "").trim();
    if (!text) return reply({ error: "لا يوجد نص للتعليق الصوتي." }, 400);
    const voice = String(body?.voice || "Charon");
    const style = String(body?.style || "صحفي وثائقي هادئ وواضح، بالعربية الفصحى الطبيعية، سرعة متوسطة، بلا مبالغة درامية");
    const result = await requestFlashSpeech({ key, text, voice, style, budgetMs:Math.max(10000,Math.min(80000,Number(body.budgetMs)||80000)) });
    return reply(result.body, result.status);
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
