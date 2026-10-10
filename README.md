# Alnuqta Social Studio

استوديو مستقل بالواجهة والكود لإنتاج تصاميم ومحتوى السوشيال ميديا لمنصة النقطة.

## البنية الفعلية

المستودع يحتوي واجهة ثابتة واحدة منشورة عبر GitHub Pages. لا توجد خطوة تجميع
للواجهة ولا خادم فيديو. الرندر النهائي للفيديو يتم داخل المتصفح بواسطة
`Canvas API` و`MediaRecorder API`. الواجهة تتصل بأربع
Supabase Edge Functions موجودة في مشروع Supabase نفسه المستخدم من موقع
`alnuqta-media`:

- `gemini-studio`: معالجة أوامر المحتوى.
- `gemini-image`: توليد الصور التوضيحية.
- `pexels-search`: البحث عن صور وفيديو.
- `gemini-tts`: توليد التعليق الصوتي.

الصوت الأساسي داخل الفيديو يأتي من Gemini TTS. يتوفر أيضاً تسجيل تعليق بشري
اختياري من الميكروفون مباشرة داخل المتصفح، مع المعاينة والحذف واختيار مصدر الصوت
قبل التصدير. لا توجد خاصية رفع ملف صوت جاهز. يمكن رفع الصور والفيديوهات البصرية للمشهد، ويمكن استخدام Gemini Image
أو Pollinations.ai للصور التوضيحية، وPexels للصور ولقطات B-roll.

الاستوديو مستقل عن الموقع الرئيسي على مستوى الواجهة والمستودع، لكنه يشارك معه
البنية الخلفية في Supabase.

## الأمان

مفاتيح Gemini وPexels محفوظة في Supabase Secrets ولا تظهر في المتصفح. الدوال
الأربع تطبق:

- قائمة Origin مسموح بها للاستوديو.
- CORS يعيد الـOrigin المسموح فقط.
- rate limiting بمقدار 20 طلباً لكل دالة وبصمة شبكة في الساعة.
- SHA-256 لبصمة الشبكة من دون تخزين IP خام.

كود الدوال وmigrations موجودان في:
[alnuqta-media/supabase](https://github.com/alnuqtamedia/alnuqta-media/tree/main/supabase).

## النشر

النشر يتم تلقائياً إلى GitHub Pages بواسطة
`.github/workflows/pages-deploy.yml` عند رفع أي تغيير إلى فرع `main`. يستخدم
المشروع `npm` وملف `package-lock.json`. أمر `npm test` يتحقق من الشيفرة والأسرار
والمسارات القديمة، ثم يبني مجلد `dist` نظيفاً لا يحتوي إلا على `index.html`
و`.nojekyll`. هذا المجلد وحده يُرفع إلى Pages، لذلك لا تُنشر `.git` أو
`node_modules` أو ملفات الاختبار والفيديو والسجلات.

الرابط:
https://alnuqtamedia.github.io/alnuqta-social-studio/

## التشغيل المحلي

نفّذ الاختبارات والبناء أولاً:

```bash
npm ci
npm test
```

ثم شغّل `dist` عبر خادم ملفات محلي، لأن فتح `index.html` مباشرة بصيغة `file://`
لا يرسل Origin مقبولاً إلى Supabase.

مثال:

```bash
python3 -m http.server 8000 --directory dist
```

إذا كان التطوير المحلي مطلوباً، أضف `http://localhost:8000` مؤقتاً إلى
`STUDIO_ALLOWED_ORIGINS` في Supabase ثم احذفه بعد انتهاء الاختبار.

## ملاحظات

لا توجد مسارات Vercel أو Netlify أو Cloudflare Workers في البنية الحالية.
`index.html` يتصل مباشرة بدوال Supabase المحمية.

ردود Gemini تُحوّل إلى مخطط مشاهد موحد ثم تُفحص قبل إدخالها إلى القوالب. يشمل
كل مشهد المعرّف والعنوان والتعليق والترجمة والأصل البصري والمصدر والنوع والمدة
والحركة والانتقال وملاحظات المحرر. تبقى `edge-tts` مؤجلة لأنها تحتاج خدمة Node
مستمرة ولا تعمل كجزء من GitHub Pages أو Cloudflare Worker بسيط.


## Production preview — 2026-10-10

Development branch: `dev/studio-production-20261010`. Rollback baseline: `backup/studio-before-production-20261010` at `c41e6d0`. Main and the live Pages release are not replaced by this preview.

- Text PDF extraction uses pinned, local PDF.js (15MB / 80 pages / 40,000 characters); scanned PDFs require a text copy. Only extracted text is sent to the existing Gemini provider when executing.
- Microphone recording is opt-in, capped at 90 seconds / 4MB, sent inline to Gemini for transcription. The resulting command must be reviewed and executed separately.
- Pexels assets retain author, source and license links. Selection is heuristic, not a guarantee of editorial suitability or release rights. Generic stock is marked illustrative; no Google Images scraping.
- Narration groups neighbouring scenes into paragraphs; paragraph boundaries are measured, scene boundaries within paragraphs are estimates. Overlong speech is rejected, never clipped or accelerated. Existing human narration is retained.
- Rendering runs on the device, with real video when available, cuts/fades, portrait/landscape and existing logo/contact fields. Keep the tab visible. Default is 720p; 1080p and long projects use more memory. Tested-duration scope is 5–600 seconds, not unlimited. MP4 is browser-dependent; otherwise the output is correctly labelled WebM.
- Saved projects remain in the existing local database. New project requires confirmation and does not erase saved snapshots. No automatic permanent media/report storage is added.
- Preview functions are separate from live functions, JWT checked and share existing per-hour rate limits. Gemini/Pexels quotas may prevent generation; no billing is enabled and no unlimited free generation is promised.

### Release gate
Run `npm ci && npm test`, then verify in a real browser: PDF → command → assets → paragraph audio → 45-second vertical export and 120-second landscape export; listen through, inspect media provenance and logo, measure exported duration, cancel during generation/export, and save/restore/new-project. Passing static tests does not prove browser audio/render quality. Release only after these checks and owner review of the preview.
