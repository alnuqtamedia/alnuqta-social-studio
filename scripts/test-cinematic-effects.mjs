import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const sandbox={};vm.createContext(sandbox);vm.runInContext(fs.readFileSync('public/cinematic-effects.js','utf8'),sandbox);
const C=sandbox.StudioCinema;
const cinema={motion:'zoom-in',look:'cinematic',intensity:.5,vignette:.1,grain:false,transition:'wipe-left',transitionSeconds:.4};
const slide={title:'اختبار',visualType:'illustrative',cinema};
assert.equal(C.settings({}),null);
assert.equal(C.settings({...slide,cinema:{...cinema,intensity:NaN}}),null);
assert.equal(C.settings({...slide,cinema:{...cinema,vignette:1}}),null);
assert.equal(C.settings({...slide,cinema:{...cinema,look:'arbitrary-css'}}),null);
assert.equal(C.settings({...slide,visualType:'document'}).look,'natural');
assert.equal(C.settings({...slide,creative:{kind:'document-focus'}}).motion,'static');
assert.equal(C.settings({...slide,visualType:'document',cinema:{...cinema,grain:true}}).grain,false);
for(const motion of ['static','zoom-in','zoom-out','pan-left','pan-right']){
 for(const [w,h,W,H] of [[1200,800,720,1280],[800,1200,1280,720]]){
  for(const time of [-1,0,5,10,30]){
   const r=C.geometry(w,h,W,H,motion,time,10);assert(r.x<=.001&&r.y<=.001);assert(r.x+r.width>=W-.001&&r.y+r.height>=H-.001);
   assert.deepEqual(C.geometry(w,h,W,H,motion,time,10),r);
  }
 }
}
assert.equal(C.geometry(0,10,720,1280,'zoom-in',1,3),null);
assert(C.geometry(1200,800,720,1280,'zoom-in',10,10).width>C.geometry(1200,800,720,1280,'zoom-in',0,10).width);
assert(C.geometry(1200,800,720,1280,'pan-left',10,10).x<C.geometry(1200,800,720,1280,'pan-left',0,10).x);
assert.equal(C.transitionFor({transition:'fade'},2).seconds,.2);
assert.equal(C.transitionFor({...slide,cinema:{...cinema,transition:'dip-black',transitionSeconds:1}},.5).seconds,.125);
const before=JSON.stringify(slide),stack=[],calls=[];
const ctx={globalAlpha:.4,filter:'none',save(){stack.push([this.globalAlpha,this.filter]);},restore(){[this.globalAlpha,this.filter]=stack.pop();},beginPath(){},rect(...r){assert(r.every(Number.isFinite));},clip(){},drawImage(...r){calls.push(['media',this.filter,...r.slice(1)]);},fillRect(...r){assert(r.every(Number.isFinite));calls.push(['rect',this.globalAlpha,...r]);},createRadialGradient(){return {addColorStop(){}};}};
assert(C.drawMedia(ctx,{width:1200,height:800},slide,720,1280,3,10));
assert.equal(ctx.filter,'none');assert.equal(ctx.globalAlpha,.4);assert(calls[0][1].includes('contrast'));
C.drawFinish(ctx,slide,720,1280,3);assert.equal(ctx.globalAlpha,.4);
for(const type of ['cut','fade','dip-black','wipe-left','wipe-right'])for(const progress of [0,.25,.5,.75,1]){
 const seen=[];C.transition(ctx,()=>seen.push('current'),()=>seen.push('previous'),{type,progress,width:720,height:1280});
 assert.equal(ctx.globalAlpha,.4);assert.equal(stack.length,0);assert(seen.length>0);
 if(progress===1||type==='cut')assert.deepEqual(seen,['current']);
}
assert.equal(JSON.stringify(slide),before);
assert.equal(C.parseCommand('ولد فيديو 60 ثانية'),null);
assert.equal(C.parseCommand('سينما للمشهد ٢: سينمائي حركة تقريب انتقال سواد').cinema.transition,'dip-black');
assert.equal(C.parseCommand('أزل السينما من المشهد 2').cinema,null);
assert.throws(()=>C.parseCommand('سينما للمشهد 2: إعدادات ناقصة'));
// Normalization and project serialization retain opt-in settings; old projects remain opt-out.
const html=fs.readFileSync('index.html','utf8'),normalize=html.slice(html.indexOf('function normalizeAISlides('),html.indexOf('function applyGeminiResult('));
vm.runInContext('var window=globalThis;'+normalize,sandbox);
assert.equal(sandbox.normalizeAISlides([slide],'','')[0].cinema.look,'cinematic');
assert.equal(sandbox.normalizeAISlides([{title:'قديم'}],'','')[0].cinema,undefined);
console.log('Cinema: deterministic covered geometry, color isolation, evidence protection, transition endpoints, command validation and normalized settings passed.');
