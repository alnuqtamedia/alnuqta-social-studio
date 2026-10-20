import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const sandbox={};vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../public/motion-graphics.js',import.meta.url),'utf8'),sandbox);
const api=sandbox.StudioMotion;
const compare={kind:'comparison',source:'جدول المحرر',unit:'دينار',items:[{label:'أ',value:0},{label:'ب',value:12}]};
assert.equal(api.creativePlan({creative:compare}).items[0].value,0);
for(const bad of [-1,Infinity,NaN,'12',null])assert.equal(api.creativePlan({creative:{...compare,items:[{label:'أ',value:bad},{label:'ب',value:12}]}}),null);
assert.equal(api.creativePlan({creative:{...compare,source:''}}),null);
assert.equal(api.creativePlan({}),null);
const quote={kind:'quote',text:'اقتباس حرفي',source:'مصدر'};
assert.equal(api.creativePlan({voiceover:'هذا اقتباس حرفي موجود',creative:quote}).kind,'quote');
assert.equal(api.creativePlan({voiceover:'نص آخر',creative:quote}),null);
const doc={kind:'document-focus',source:'وثيقة',rect:{x:.1,y:.2,width:.5,height:.1}};
assert.equal(api.creativePlan({visualType:'document',creative:doc}).kind,'document-focus');
assert.equal(api.creativePlan({visualType:'image',creative:doc}),null);
assert.equal(api.creativePlan({visualType:'document',creative:{...doc,rect:{...doc.rect,x:.9}}}),null);
let calls=0;const stack=[];
const ctx={globalAlpha:.4,measureText:s=>({width:String(s).length*9}),save(){stack.push(this.globalAlpha)},restore(){this.globalAlpha=stack.pop()},fillRect(...a){assert(a.every(Number.isFinite));calls++},strokeRect(...a){assert(a.every(Number.isFinite));calls++},fillText(t,x,y){assert(Number.isFinite(x)&&Number.isFinite(y));calls++},beginPath(){},rect(){},clip(){},translate(){},scale(){},setLineDash(){},stroke(){}};
for(const creative of [quote,compare,doc])for(const [width,height] of [[720,1280],[1280,720]])for(const time of [0,.25,2]){
 const slide={title:'التقرير',voiceover:'هذا اقتباس حرفي موجود',visualType:'document',creative};
 const before=JSON.stringify(slide);
 api.draw(ctx,slide,{width,height,time,duration:4});
 assert.equal(ctx.globalAlpha,.4);assert.equal(stack.length,0);assert.equal(JSON.stringify(slide),before);
}
assert(calls>0);
console.log('Creative overlay validation and 18 mock canvas scenarios passed; pixel/video QA still required.');

assert.equal(api.parseCreativeCommand('ولد فيديو 60 ثانية'),null);
assert.equal(api.parseCreativeCommand('أزل القالب من المشهد 2').creative,null);
assert.equal(api.parseCreativeCommand('اقتباس للمشهد ٢: "نص" المصدر "مصدر"').sceneIndex,1);
assert.equal(api.parseCreativeCommand('مقارنة للمشهد 1: "أ" 0 و "ب" 12 الوحدة "دينار" المصدر "جدول"').creative.items[0].value,0);
assert.throws(()=>api.parseCreativeCommand('مقارنة للمشهد 2: بيانات ناقصة'));
console.log('Bounded creative commands passed without intercepting normal generation requests.');
