import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const required = [
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
