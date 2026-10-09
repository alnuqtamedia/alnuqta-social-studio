import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const required = [
  'renderNewsPost()',
  'newsDownload()',
  "switchTab('news')",
  'organizeVideoScenes()',
  'generateAIVoiceover()',
  'exportVerticalVideo()',
  'gemini-studio',
  'gemini-image',
  'gemini-tts',
  'pexels-search',
  'STUDIO_OUTPUT_SCHEMA',
  'validateGeminiResult',
  'generateScenePollinationsImage',
  'startHumanVoiceRecording()',
  'getActiveVoiceover()',
  'exportAllSlides()',
  'exportAllTikTokSlides()',
  "target.style.height = presentationMode?'360px':'450px'",
  "H=quality===720?1280:1920",
  'drawSceneFallback(',
  'STUDIO_BUILD',
  'copyExportDiagnostics()',
  "stage('تجهيز قالب المشهد '",
];

for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`Missing required Studio integration: ${marker}`);
}

for (const match of html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)) {
  Function(match[1]);
}

const forbiddenBrowserPatterns = [
  [/service_role/i, 'service_role'],
  [/GEMINI_API_KEY/i, 'Gemini secret name'],
  [/AIza[0-9A-Za-z_-]{20,}/, 'Google API key'],
  [/sk-[0-9A-Za-z_-]{20,}/, 'generic secret key'],
  [/SpeechRecognition|webkitSpeechRecognition|ai-voice-btn|video-audio-file|accept=["']audio\/\*/i, 'speech command or uploaded human audio input'],
];
for (const [pattern, label] of forbiddenBrowserPatterns) if (pattern.test(html)) throw new Error(`${label} must not appear in the browser application.`);

for (const obsolete of ['wrangler.json', 'netlify.toml', 'netlify', 'api', 'src/cloudflare-worker.js']) {
  if (fs.existsSync(path.join(root, obsolete))) throw new Error(`Obsolete deployment path still exists: ${obsolete}`);
}

const trackedTextFiles = ['index.html', 'README.md', 'docs/security-status.md', 'package.json', 'package-lock.json'];
for (const file of trackedTextFiles) {
  const body = fs.readFileSync(path.join(root, file), 'utf8');
  if (/AIza[0-9A-Za-z_-]{20,}|sk-[0-9A-Za-z_-]{20,}/.test(body)) throw new Error(`Possible secret found in ${file}`);
}

console.log('Studio validation passed: schema, browser security, deployment paths, and format exporters.');

// Exercise the independent news renderer without modifying saved project storage.
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs');
const newsScript = [...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).find(s => s.includes('const NEWS_SIZES='));
const fields = Object.fromEntries(ids.filter(id => id.startsWith('news-')).map(id => [id, {value: ''}]));
const painted = [];
const context2d = new Proxy({measureText: text => ({width: String(text).length * 20}),
  createLinearGradient: () => ({addColorStop(){}}), fillText: text => painted.push(text)},
  {get(target, name){return name in target ? target[name] : () => {};}});
fields['news-canvas'].getContext = () => context2d;
fields['news-zoom'].value = '1';
fields['news-badge'].value = 'خبر';
fields['news-headline'].value = 'عنوان خبر للاختبار';
fields['news-summary'].value = 'تفاصيل الخبر كما أدخلها المحرر';
fields['news-credit'].value = 'مصدر الصورة';
fields['news-handle'].value = '@ALNUQTAMEDIA';
const sandbox = vm.createContext({document: {getElementById: id => fields[id]}, console});
vm.runInContext(newsScript, sandbox);
for (const [format, height] of [['feed',1350],['square',1080],['story',1920]]) {
  fields['news-format'].value = format;
  vm.runInContext('renderNewsPost()', sandbox);
  assert.equal(fields['news-canvas'].width,1080);
  assert.equal(fields['news-canvas'].height,height);
}
assert(painted.includes('عنوان خبر للاختبار'));
assert(painted.includes('الصورة: مصدر الصورة'));
fields['news-body'].value = 'خبر قصير موثّق. تفاصيل إضافية للمادة.';
vm.runInContext('newsSuggest()', sandbox);
assert.equal(fields['news-headline'].value,'خبر قصير موثّق');
assert(fields['news-caption'].value.includes('تفاصيل إضافية للمادة.'));
assert(!fields['news-caption'].value.includes('undefined'));
fields['news-caption'].value = 'صياغة المحرر اليدوية';
vm.runInContext('newsCaptionDirty=true;newsInput()', sandbox);
assert.equal(fields['news-caption'].value,'صياغة المحرر اليدوية');
console.log('News design checks passed: three sizes, credit, caption, and manual edits.');
