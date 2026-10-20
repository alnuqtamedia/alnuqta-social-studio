import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {directionPrompt,cinemaSchema,quoteSchema,sanitizeDirection} from '../supabase/functions/_shared/creative-direction.mjs';
const cinema={motion:'zoom-in',look:'cinematic',intensity:.5,vignette:.1,grain:false,transition:'dip-black',transitionSeconds:.4};
const slide={title:'تقرير',voiceover:'قال التقرير إن العمل مستمر',duration:5,visualType:'broll',visualQuery:'general work',cinema,creative:{kind:'quote',text:'العمل مستمر',source:'التقرير'}};
const material='التقرير: العمل مستمر';
const clean=(s,current={sourceMaterial:material})=>sanitizeDirection({slides:[structuredClone(s)]},current).slides[0];
assert.equal(clean(slide).creative.kind,'quote');
assert(!clean(slide,{sourceMaterial:'مصدر مختلف'}).creative);
assert(!clean({...slide,voiceover:'نص آخر'}).creative);
assert(!clean({...slide,cinema:{...cinema,intensity:NaN}}).cinema);
assert(!clean({...slide,cinema:{...cinema,transition:'unknown'}}).cinema);
assert.equal(clean({...slide,visualType:'document'}).cinema.motion,'static');
assert.equal(clean({...slide,visualType:'document'}).cinema.look,'natural');
const comparison={kind:'comparison',source:'المحرر',unit:'دينار',items:[{label:'أ',value:1},{label:'ب',value:2}]};
assert(!clean({...slide,creative:comparison}).creative);
assert.equal(clean({...slide,creative:comparison},{slides:[{creative:comparison}]}).creative.kind,'comparison');
assert(!clean({title:'مشروع قديم'}).cinema);
// Run the real planner handler with mocked provider/security, including its response schema.
let handle,requests=[];
const ctx=vm.createContext({Response,AbortSignal,console,JSON,Object,Number,String,Array,Error,
 directionPrompt,cinemaSchema,quoteSchema,sanitizeDirection,
 authorizeStudioOrigin:()=>({cors:{'Content-Type':'application/json'}}),
 enforceStudioRateLimit:async()=>null,extractText:d=>d.output_text,
 Deno:{env:{get:k=>k==='GEMINI_API_KEY'?'test-key':undefined},serve:fn=>{handle=fn}},
 fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,status:200,text:async()=>JSON.stringify({output_text:JSON.stringify({outputType:'video',title:'خبر',subtitle:'تقرير',slides:[slide]})})}}
});
const backend=fs.readFileSync('supabase/functions/gemini-studio-preview/index.ts','utf8')
 .replace(/^import .*;\n/gm,'').replace(/: (Request|unknown|any)\b/g,'').replace(/:(unknown|any)\b/g,'');
vm.runInContext(backend,ctx);
const req={method:'POST',text:async()=>JSON.stringify({command:'حوّل التقرير إلى فيديو سينمائي',currentContent:{sourceMaterial:material,mode:'new-from-source'}})};
const response=await handle(req);assert.equal(response.status,200);
const result=await response.json();
assert.equal(result.slides[0].cinema.look,'cinematic');
assert.equal(result.slides[0].creative.text,'العمل مستمر');
assert(requests[0].input.includes(directionPrompt));
assert(requests[0].response_format.schema.properties.slides.items.properties.cinema);
assert.equal(requests[0].store,false);
const renderCtx=vm.createContext({});
vm.runInContext(fs.readFileSync('public/cinematic-effects.js','utf8'),renderCtx);
vm.runInContext(fs.readFileSync('public/motion-graphics.js','utf8'),renderCtx);
assert.equal(renderCtx.StudioCinema.normalize(result.slides[0]).transition,'dip-black');
assert.equal(renderCtx.StudioMotion.creativePlan(result.slides[0]).kind,'quote');
const index=fs.readFileSync('index.html','utf8');
assert(index.includes('cinema: window.StudioCinema?.normalize(slide)'));
assert(index.includes('creative: window.StudioMotion?.creativePlan(slide)'));
console.log('Gemini auto direction: real handler schema/prompt, renderer handoff, source quotation checks, document protection, invalid settings, manual overlays and legacy scenes passed.');
