import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const root=vm.createContext({Path2D:class {constructor(path){this.path=path;}}});vm.runInContext(fs.readFileSync('public/motion-graphics.js','utf8'),root);const M=root.StudioMotion;
const scene={title:'فحص الإنتاج',voiceover:'تبدأ مراجعة المصنع بفحص التراخيص ثم سجلات التشغيل، وتقارن المبيعات بالمخزون.',graphics:[{label:'شركة متهمة',anchor:'المصنع',icon:'factory'},{label:'المصنع',anchor:'المصنع',icon:'factory'},{label:'التراخيص',anchor:'التراخيص',icon:'document'}]};
const before=JSON.stringify(scene),p=M.plan(scene);assert.equal(p.annotations.length,2);assert.equal(p.annotations[0].label,'المصنع');assert(p.annotations.every(a=>scene.voiceover.includes(a.label)));assert.equal(p.phrases.map(x=>x.words.join(' ')).join(' '),scene.voiceover);assert(Math.abs(p.phrases.reduce((n,a)=>n+a.span,0)-1)<1e-9);
assert.equal(M.plan({title:'الخاتمة',subtitle:'اتبع المال واطلب الدليل',voiceover:'اتبع المال واطلب الدليل'}).title,'اتبع المال واطلب الدليل');
assert(M.plan({voiceover:'التعليم في المدرسة وتحسين المياه والطاقة'}).annotations.some(a=>a.icon==='education'));
assert(!M.plan({voiceover:'العمال ينظمون العمل التجاري'}).annotations.some(a=>a.icon==='water'||a.icon==='money'));
const chronological=M.plan({voiceover:'نراجع المصنع والتراخيص ونقارن سجلات التشغيل بالمخزون.'}).annotations;assert(chronological.every((a,i)=>!i||a.at>=chronological[i-1].at));
const painted=[],rects=[];let alpha=1;const ctx={save(){},restore(){},translate(){},scale(){},setLineDash(){},stroke(){},fillRect(...a){assert(a.every(Number.isFinite));rects.push(a);},measureText:t=>({width:String(t).length*12}),fillText(t,x,y){assert(Number.isFinite(x)&&Number.isFinite(y));painted.push({t,x,y,alpha});},set globalAlpha(v){assert(v>=0&&v<=1);alpha=v;},get globalAlpha(){return alpha;}};
M.draw(ctx,scene,{width:720,height:1280,time:.1,duration:12});const early=JSON.stringify(painted);painted.length=0;M.draw(ctx,scene,{width:720,height:1280,time:10,duration:12});assert.notEqual(JSON.stringify(painted),early);assert(painted.some(x=>x.t==='المصنع'));assert.equal(JSON.stringify(scene),before);
M.draw(ctx,{title:'التمويل',visualType:'data',voiceover:'القرض 20 مليون والفوائد 5 ملايين',points:['20 مليون','5 ملايين']},{width:1280,height:720,time:5,duration:10});assert(painted.some(x=>x.t.includes('20 مليون')));assert(painted.some(x=>x.t.includes('5 ملايين')));
const controller=fs.readFileSync('public/studio-production.js','utf8');assert(controller.includes('W,H,local,ds[i]'));assert(controller.includes('syncPassed&&targetPassed')); assert(controller.includes("$('video-sync-mode').value='fit-audio'"));
console.log('Motion: source-anchored icons, complete phrase text, animated frames, landscape, literal numbers, unchanged input and timed renderer integration passed.');
// New composition is explicit, with a large opening that settles above the footage.
for(const [W,H] of [[720,1280],[1280,720]]){
 const opening=M.kineticLayout(W,H,.8),settled=M.kineticLayout(W,H,3);
 assert(opening.titleSize>settled.titleSize*1.9);assert(opening.titleY>settled.titleY+H*.2);
}
ctx.beginPath=()=>{};ctx.rect=()=>{};ctx.clip=()=>{};
const kinetic={...scene,typography:'kinetic'},unchanged=JSON.stringify(kinetic);
for(const [width,height] of [[720,1280],[1280,720]])for(const time of [0,.3,1,2,4,11.9]){
 M.draw(ctx,kinetic,{width,height,time,duration:12});
 M.draw(ctx,{...kinetic,creative:{kind:'quote',text:'سجلات التشغيل',source:'مادة الاختبار'}},{width,height,time,duration:12});
}
assert.equal(JSON.stringify(kinetic),unchanged);
const html=fs.readFileSync('index.html','utf8');
assert(html.includes("typography: kinetic ? 'kinetic' : undefined"));
assert(html.includes("typography: slide.typography === 'kinetic' ? 'kinetic' : undefined"));
console.log('Kinetic typography: opening/docked layout, both formats, quote focus, finite coordinates, explicit generation and unchanged source passed.');
