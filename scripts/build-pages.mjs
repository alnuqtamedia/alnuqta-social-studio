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
fs.writeFileSync(path.join(output, '.nojekyll'), '');

const files = fs.readdirSync(output, { withFileTypes: true }).map(entry => entry.name).sort();
if (files.join(',') !== '.nojekyll,index.html,project-backup.html,public,social-accounts.html') throw new Error(`Unexpected Pages bundle: ${files.join(', ')}`);
console.log(`Pages bundle ready: ${files.length} files (${files.join(', ')})`);

