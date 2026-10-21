import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('node_modules/d3-ease/dist/d3-ease.min.js','utf8'),sandbox);vm.runInContext(fs.readFileSync('node_modules/roughjs/bundled/rough.js','utf8'),sandbox);vm.runInContext(fs.readFileSync('public/design-pack.js','utf8'),sandbox);
const D=sandbox.StudioDesignPack,source=JSON.parse(fs.readFileSync('public/vendor/sources.json')),data=JSON.parse(fs.readFileSync('public/vendor/tabler/outline-paths.json'));
Object.assign(D.state.icons,data.icons);D.state.ready=true;
assert.equal(Object.keys(D.state.icons).length,source.tabler.icons);assert(source.tabler.icons>4500);assert.equal(data.unsupported.length,0);assert(!Object.keys(data.icons).some(x=>x.startsWith('brand-')));
for(const [path,sha] of [['public/vendor/tabler/outline-paths.json',source.tabler.sha256],['public/vendor/cairo/Cairo.ttf',source.cairo.sha256]])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'),sha);
const catalog=JSON.parse(fs.readFileSync('public/graphics-catalog.json'));assert.equal(catalog.resources.filter(x=>x.status==='integrated').length,4);assert.equal(catalog.resources.length,16);assert(catalog.resources.every(x=>x.url.startsWith('https://github.com/')&&['MIT','ISC','BSD-3-Clause','OFL-1.1'].includes(x.license)));
assert.equal(D.normalize({}),null);assert.equal(D.font({}),'Cairo');assert.equal(D.font({design:{pack:'press-v1',preset:'finance'}}),'StudioCairo');
for(const preset of Object.keys(D.presets))for(const t of [-1,0,.1,.5,.9,1,2]){const value=D.ease({pack:'press-v1',preset},t);assert(Number.isFinite(value)&&value>=0&&value<=1);}
assert.notEqual(D.ease({pack:'press-v1',preset:'finance'},.4),D.ease({pack:'press-v1',preset:'investigation'},.4));
assert.equal(D.presetFor('قالب بسيط'),'minimal');assert.equal(D.presetFor('تقرير اقتصادي عن المبيعات'),'finance');assert.equal(D.presetFor('تحقيق استقصائي اقتصادي'),'investigation');
assert(D.search('مال').some(x=>x.includes('cash')));assert(D.search('وثائق').some(x=>x.includes('file')));
const slide={voiceover:'تبدأ مراجعة سجلات المتجر',design:{pack:'press-v1',preset:'editorial',icon:'file-text',label:'سجلات'}};
assert.equal(D.selectedCue(slide,1,null).icon,'file-text');assert.equal(D.selectedCue({...slide,voiceover:'نص آخر'},1,null),null);
const make=()=>sandbox.rough.generator().rectangle(20,30,120,60,{seed:217,roughness:.6,stroke:'#ff6570'});assert.equal(JSON.stringify(make()),JSON.stringify(make()));
console.log('Design pack: 4808 pinned paths, source hashes, licenses/status catalog, Arabic search, source-anchored selection, deterministic Rough and bounded D3 easing passed.');
