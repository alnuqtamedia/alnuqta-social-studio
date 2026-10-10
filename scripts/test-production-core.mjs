import {extractText} from '../backend/_shared/gemini-output.mjs';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const ctx=vm.createContext({URL});vm.runInContext(fs.readFileSync('public/production-core.js','utf8'),ctx);const C=ctx.StudioProductionCore;
const slides=Array.from({length:8},(_,i)=>({voiceover:`فقرة رقم ${i} من مادة اختبار طويلة للتأكد من توزيع الصوت على المشاهد بشكل طبيعي`}));
const groups=C.groups(slides,120);assert(groups.length<slides.length);assert.deepEqual(Array.from(groups.flatMap(g=>g.indexes)),[0,1,2,3,4,5,6,7]);
const d=groups.map(()=>20),timing=C.timing(slides,groups,d,120);assert(Math.abs(timing.reduce((a,b)=>a+b,0)-120)<.001);assert(timing.every(x=>x>0));assert.throws(()=>C.timing(slides,groups,groups.map(()=>120),120),/لا يُقطع/);
assert.deepEqual(Array.from(C.numbers('٥٠٠ و ۱۲٫۵')),['500','12.5']);assert.equal(C.output('تقرير تلفزيوني دقيقتين'),'landscape');assert.equal(C.output('ريلز دقيقة'),'portrait');
const good={id:1,type:'video',mediaUrl:'https://videos.pexels.com/a.mp4',pageUrl:'https://www.pexels.com/video/a-1/',creator:'Photo author',duration:30};assert(C.safePexels(good));assert(!C.safePexels({...good,pageUrl:'https://unknown.example/a'}));assert(!C.safePexels({...good,mediaUrl:'http://videos.pexels.com/a.mp4'}));assert.equal(C.choose([good],new Set(['1:video']),10),null);
for(const name of ['public/studio-production.js','public/production-core.js'])new vm.Script(fs.readFileSync(name,'utf8'));
const js=fs.readFileSync('public/studio-production.js','utf8');assert(!/https?:[^\s]+(?:run\.app|pollinations)|API\+[^;]*studio-render/i.test(js));assert(js.includes('state.abort?.abort()'));assert(js.includes('لن تُحذف'));assert(js.includes('await task.destroy()'));assert(!js.includes('playbackRate='));assert(js.includes('store=>')===false);
console.log('Production checks passed: paragraph grouping, exact timeline totals, no speech clipping, approved media provenance, no duplicate media, orientations, syntax, cancellation and local-only render.');

const json='{}';assert.equal(extractText({outputs:[{text:json}],steps:[{type:'model_output',content:[{text:json}]}]}),json);assert.equal(extractText({steps:[{type:'model_output',content:[{text:'old'}]},{type:'model_output',content:[{text:json}]}]}),json);
