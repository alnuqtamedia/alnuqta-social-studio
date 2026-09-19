# Alnuqta Social Studio

استوديو مستقل بالواجهة والكود لإنتاج تصاميم ومحتوى السوشيال ميديا لمنصة النقطة.

## البنية الفعلية

المستودع يحتوي واجهة ثابتة واحدة منشورة عبر GitHub Pages. الواجهة تتصل بأربع
Supabase Edge Functions موجودة في مشروع Supabase نفسه المستخدم من موقع
`alnuqta-media`:

- `gemini-studio`: معالجة أوامر المحتوى.
- `gemini-image`: توليد الصور التوضيحية.
- `pexels-search`: البحث عن صور وفيديو.
- `gemini-tts`: توليد التعليق الصوتي.

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
`.github/workflows/pages-deploy.yml` عند رفع أي تغيير إلى فرع `main`.

الرابط:
https://alnuqtamedia.github.io/alnuqta-social-studio/

## التشغيل المحلي

لا يحتاج المشروع إلى Node.js أو build step. شغّله عبر خادم ملفات محلي، لأن فتح
`index.html` مباشرة بصيغة `file://` لا يرسل Origin مقبولاً إلى Supabase.

مثال:

```bash
python3 -m http.server 8000
```

إذا كان التطوير المحلي مطلوباً، أضف `http://localhost:8000` مؤقتاً إلى
`STUDIO_ALLOWED_ORIGINS` في Supabase ثم احذفه بعد انتهاء الاختبار.

## ملاحظات

لا توجد مسارات Vercel أو Netlify أو Cloudflare Workers في البنية الحالية.
`index.html` يتصل مباشرة بدوال Supabase المحمية.
