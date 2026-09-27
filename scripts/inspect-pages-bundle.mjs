import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const files = fs.readdirSync(dist, { recursive: true }).map(String).sort();
const forbidden = files.filter(file => /(^|\/)(node_modules|\.git)(\/|$)|\.(mp4|webm|mov|wav|mp3|log|zip)$/i.test(file));
if (forbidden.length) throw new Error(`Forbidden deployment files: ${forbidden.join(', ')}`);
if (!files.includes('index.html')) throw new Error('Pages bundle is missing index.html');
if (files.length !== 2) throw new Error(`Pages bundle should contain exactly 2 files, found ${files.length}`);
console.log(`Pages bundle verified: ${files.length} files, no node_modules, no .git, no test media, no logs.`);
