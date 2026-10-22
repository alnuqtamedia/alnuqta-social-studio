import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(output, 'index.html'));
fs.copyFileSync(path.join(root, 'social-accounts.html'), path.join(output, 'social-accounts.html'));
fs.copyFileSync(path.join(root, 'project-backup.html'), path.join(output, 'project-backup.html'));
fs.cpSync(path.join(root,'public'),path.join(output,'public'),{recursive:true});
fs.mkdirSync(path.join(output,'public/pdfjs'),{recursive:true});
for(const name of ['pdf.mjs','pdf.worker.mjs'])fs.copyFileSync(path.join(root,'node_modules/pdfjs-dist/build',name),path.join(output,'public/pdfjs',name));
fs.copyFileSync(path.join(root,'node_modules/pdfjs-dist/LICENSE'),path.join(output,'public/pdfjs/LICENSE'));
const vendor=path.join(output,'public/vendor');fs.mkdirSync(path.join(vendor,'licenses'),{recursive:true});
for(const [source,target] of [['d3-ease/dist/d3-ease.min.js','d3-ease.min.js'],['roughjs/bundled/rough.js','rough.js'],['chart.js/dist/chart.umd.min.js','chart.umd.min.js']])fs.copyFileSync(path.join(root,'node_modules',source),path.join(vendor,target));
for(const name of ['d3-ease','roughjs','hachure-fill','path-data-parser','points-on-curve','points-on-path'])fs.copyFileSync(path.join(root,'node_modules',name,'LICENSE'),path.join(vendor,'licenses',name+'.txt'));

fs.writeFileSync(path.join(output, '.nojekyll'), '');

const files = fs.readdirSync(output, { withFileTypes: true }).map(entry => entry.name).sort();
if (files.join(',') !== '.nojekyll,index.html,project-backup.html,public,social-accounts.html') throw new Error(`Unexpected Pages bundle: ${files.join(', ')}`);
console.log(`Pages bundle ready: ${files.length} files (${files.join(', ')})`);


fs.copyFileSync(path.join(root,'node_modules/chart.js/LICENSE.md'),path.join(vendor,'licenses/chart.js.txt'));
fs.copyFileSync(path.join(root,'node_modules/@kurkle/color/LICENSE.md'),path.join(vendor,'licenses/kurkle-color.txt'));

// Pinned MIT Lottie player and a lazy, single-thread FFmpeg build, served locally.
fs.copyFileSync(path.join(root,'node_modules/lottie-web/build/player/lottie_canvas.min.js'),path.join(vendor,'lottie_canvas.min.js'));
fs.copyFileSync(path.join(root,'node_modules/lottie-web/LICENSE.md'),path.join(vendor,'licenses/lottie-web.txt'));
const ffmpeg=path.join(vendor,'ffmpeg');fs.mkdirSync(ffmpeg,{recursive:true});
for(const name of ['ffmpeg.js','814.ffmpeg.js'])fs.copyFileSync(path.join(root,'node_modules/@ffmpeg/ffmpeg/dist/umd',name),path.join(ffmpeg,name));
for(const name of ['ffmpeg-core.js','ffmpeg-core.wasm'])fs.copyFileSync(path.join(root,'node_modules/@ffmpeg/core/dist/umd',name),path.join(ffmpeg,name));
fs.copyFileSync(path.join(root,'public/vendor/ffmpeg-notices/LICENSE-wrapper'),path.join(ffmpeg,'LICENSE-wrapper'));
fs.copyFileSync(path.join(root,'node_modules/@ffmpeg/core/package.json'),path.join(ffmpeg,'core-package.json'));
