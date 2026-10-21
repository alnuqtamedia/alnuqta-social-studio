import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const files = fs.readdirSync(dist, { recursive: true }).map(String).sort();
const forbidden = files.filter(file => /(^|\/)(node_modules|\.git)(\/|$)|\.(mp4|webm|mov|wav|mp3|log|zip)$/i.test(file));
if (forbidden.length) throw new Error(`Forbidden deployment files: ${forbidden.join(', ')}`);
if (!files.includes('index.html')) throw new Error('Pages bundle is missing index.html');
const expected=['.nojekyll','index.html','project-backup.html','public','public/cinematic-effects.js','public/design-pack.js','public/graphics-catalog.json','public/motion-graphics.js','public/pdfjs','public/preview-config.js','public/production-core.js','public/studio-production.js','public/vendor','public/vendor/THIRD_PARTY_NOTICES.md','public/vendor/sources.json','public/vendor/cairo','public/vendor/cairo/Cairo.ttf','public/vendor/cairo/OFL.txt','public/vendor/cairo/fonts.css','public/vendor/tabler','public/vendor/tabler/LICENSE','public/vendor/tabler/outline-paths.json','public/vendor/d3-ease.min.js','public/vendor/rough.js','public/vendor/licenses',...['d3-ease','roughjs','hachure-fill','path-data-parser','points-on-curve','points-on-path'].map(n=>'public/vendor/licenses/'+n+'.txt'),'social-accounts.html'].sort();
if(files.filter(x=>!x.startsWith('public/pdfjs/')).join(',')!==expected.join(','))throw Error('Unexpected Pages bundle: '+files.join(','));
console.log(`Pages bundle verified: ${files.length} files, no node_modules, no .git, no test media, no logs.`);
