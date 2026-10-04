import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(output, 'index.html'));
fs.copyFileSync(path.join(root, 'social-accounts.html'), path.join(output, 'social-accounts.html'));
fs.writeFileSync(path.join(output, '.nojekyll'), '');

const files = fs.readdirSync(output, { withFileTypes: true }).map(entry => entry.name).sort();
if (files.join(',') !== '.nojekyll,index.html,social-accounts.html') throw new Error(`Unexpected Pages bundle: ${files.join(', ')}`);
console.log(`Pages bundle ready: ${files.length} files (${files.join(', ')})`);

