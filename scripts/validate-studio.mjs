import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const required = [
  'organizeVideoScenes()',
  'generateAIVoiceover()',
  'exportVerticalVideo()',
  'gemini-studio',
  'gemini-image',
  'gemini-tts',
  'pexels-search',
];

for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`Missing required Studio integration: ${marker}`);
}

for (const match of html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)) {
  Function(match[1]);
}

if (/service_role/i.test(html)) throw new Error('service_role must never appear in the browser application.');
console.log('Studio validation passed.');
