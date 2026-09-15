import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const schema = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['generate','transform','adapt','rewrite'] },
    output: { type: 'string', enum: ['carousel','story','reel','video','tiktok','post','youtube_thumbnail','multi_platform'] },
    title: { type: 'string' },
    subtitle: { type: 'string' },
    badge: { type: 'string' },
    slides: { type: 'array', items: { type: 'object', properties: {
      type: { type: 'string', enum: ['cover','content','verdict','quotes','stats','diagram','outro'] },
      badge: { type: 'string' }, title: { type: 'string' }, subtitle: { type: 'string' }, header: { type: 'string' },
      points: { type: 'array', items: { type: 'string' } },
      q1: { type: 'string' }, speaker1: { type: 'string' }, q2: { type: 'string' }, speaker2: { type: 'string' },
      stat1: { type: 'string' }, desc1: { type: 'string' }, stat2: { type: 'string' }, desc2: { type: 'string' }, stat3: { type: 'string' }, desc3: { type: 'string' },
      steps: { type: 'array', items: { type: 'string' } },
      cta: { type: 'string' }, handle: { type: 'string' }
    }, required: ['type'] } },
    caption: { type: 'string' },
    platforms: { type: 'array', items: { type: 'object', properties: {
      platform: { type: 'string' }, format: { type: 'string' }, caption: { type: 'string' }, title: { type: 'string' }
    }, required: ['platform','format'] } }
  },
  required: ['intent','output','slides']
};

const systemInstruction = `أنت المدير الإبداعي ومساعد الإنتاج داخل استوديو النقطة Media. المستخدم يعطي أمراً صوتياً أو كتابياً. نفّذ الأمر بدقة على المحتوى الحالي. لا تغيّر الهوية البصرية ولا تخترع حقائق صحفية. إذا كان الأمر تحويل محتوى موجود، حافظ على الحقائق والنصوص الأساسية ولا تضف ادعاءات جديدة. إذا طلب المستخدم توليد خبر من موضوع فقط، أنشئ مسودة تحريرية واضحة وغير مختلقة؛ لا تدّعي أرقاماً أو أحداثاً غير معطاة. المطلوب منك إعادة نتيجة منظمة ليقوم الاستوديو بوضعها مباشرة داخل القوالب الموجودة. استخدم العربية، واجعل الشرائح مختصرة وقابلة للعرض. يجب أن تحتوي النتيجة على slides حتى في التحويلات الأخرى.`;

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function handleGemini(req, res) {
  if (!ai) return json(res, 503, { error: 'GEMINI_API_KEY غير مضبوط على الخادم.' });
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let payload;
  try { payload = JSON.parse(raw); } catch { return json(res, 400, { error: 'بيانات الطلب غير صالحة.' }); }
  const command = String(payload.command || '').trim().slice(0, 12000);
  if (!command) return json(res, 400, { error: 'اكتب أمراً أولاً.' });
  const currentContent = JSON.stringify(payload.currentContent || {}, null, 2).slice(0, 30000);
  const context = `الأمر:
${command}

المحتوى الحالي في الاستوديو:
${currentContent}`;
  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: context,
      config: {
        systemInstruction,
        temperature: 0.35,
        maxOutputTokens: 6000,
        responseMimeType: 'application/json',
        responseSchema: schema
      }
    });
    const result = JSON.parse(response.text);
    return json(res, 200, result);
  } catch (error) {
    console.error('Gemini request failed:', error?.message || error);
    return json(res, 502, { error: 'تعذر تنفيذ أمر Gemini حالياً.', detail: process.env.NODE_ENV === 'development' ? String(error?.message || error) : undefined });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/gemini') return await handleGemini(req, res);
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      const html = await fs.readFile(path.join(__dirname, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  } catch (error) {
    json(res, 500, { error: 'خطأ داخلي في الاستوديو.' });
  }
});

server.listen(PORT, () => console.log(`Alnuqta Social Studio running on http://localhost:${PORT}`));
