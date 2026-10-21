import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseStructuredOutput} from '../supabase/functions/_shared/structured-output.mjs';
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
let handle,requests=[],providerSlide=slide;
const ctx=vm.createContext({Response,AbortSignal,console,JSON,Object,Number,String,Array,Error,
 directionPrompt,cinemaSchema,quoteSchema,sanitizeDirection,parseStructuredOutput,
 authorizeStudioOrigin:()=>({cors:{'Content-Type':'application/json'}}),
 enforceStudioRateLimit:async()=>null,extractText:d=>d.output_text,
 Deno:{env:{get:k=>k==='GEMINI_API_KEY'?'test-key':undefined},serve:fn=>{handle=fn}},
 fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return {ok:true,status:200,text:async()=>JSON.stringify({output_text:JSON.stringify({outputType:'video',title:'خبر',subtitle:'تقرير',slides:[providerSlide]})})}}
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
assert(requests[0].response_format.schema.properties.slides.items.required.includes('cinema'));
assert.equal(requests[0].store,false);
providerSlide={...slide,cinema:undefined};
assert.equal((await handle(req)).status,422,'missing direction must not silently produce a plain video');
providerSlide={...slide,cinema:{...cinema,intensity:4}};
assert.equal((await handle(req)).status,422,'invalid direction must preserve previous work');
providerSlide=slide;
const renderCtx=vm.createContext({});
vm.runInContext(fs.readFileSync('public/cinematic-effects.js','utf8'),renderCtx);
vm.runInContext(fs.readFileSync('public/motion-graphics.js','utf8'),renderCtx);
assert.equal(renderCtx.StudioCinema.normalize(result.slides[0]).transition,'dip-black');
assert.equal(renderCtx.StudioMotion.creativePlan(result.slides[0]).kind,'quote');
const index=fs.readFileSync('index.html','utf8');
assert(index.includes('cinema: window.StudioCinema?.normalize(slide)'));
assert(index.includes('creative: window.StudioMotion?.creativePlan(slide)'));
console.log('Gemini auto direction: real handler schema/prompt, renderer handoff, source quotation checks, document protection, invalid settings, manual overlays and legacy scenes passed.');

// Exercise actual failure handling without consuming Gemini quota.
const valid={outputType:'video',title:'اختبار',subtitle:'تقرير',slides:[slide]};
const output=value=>({status:'completed',output_text:typeof value==='string'?value:JSON.stringify(value)});
assert.equal(parseStructuredOutput(output('```json\n'+JSON.stringify(valid)+'\n```')).title,'اختبار');
assert.equal(parseStructuredOutput(output('الإجابة:\n```JSON\n'+JSON.stringify(valid)+'\n```\nانتهى')).title,'اختبار');
assert.equal(parseStructuredOutput({outputs:[{type:'thought',text:'analysis'},{type:'text',text:JSON.stringify(valid)}]}).title,'اختبار');
for(const text of ['{"slides":[','{"x":1,}','[]','null','```json\n{}\n```\n```json\n{}\n```'])assert.throws(()=>parseStructuredOutput(output(text)));
assert.throws(()=>parseStructuredOutput({...output(valid),status:'incomplete'}),e=>e.code==='incomplete_output');
const envelope=(data,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(data)});
async function scenario(responses,request=req){
 requests=[];ctx.fetch=async(url,options)=>{requests.push(JSON.parse(options.body));assert(responses.length,'Unexpected extra provider call');return responses.shift();};
 const response=await handle(request);return {status:response.status,body:await response.json(),requests:[...requests]};
}
let recovery=await scenario([envelope(output('{"slides":[')),envelope(output(valid))]);
assert.equal(recovery.status,200);assert.equal(recovery.requests.length,2);assert.equal(recovery.requests[0].model,recovery.requests[1].model);assert(recovery.requests[1].input.includes(material));assert(recovery.requests.every(r=>r.store===false));
recovery=await scenario([envelope({...output(valid),status:'incomplete'}),envelope(output(valid))]);assert.equal(recovery.status,200);assert.equal(recovery.requests.length,2);
recovery=await scenario([envelope(output('{')),envelope(output('{'))]);assert.equal(recovery.status,502);assert.equal(recovery.body.code,'invalid_json');assert.equal(recovery.body.recoveryAttempted,true);assert.equal(recovery.requests.length,2);assert(!recovery.body.details);
recovery=await scenario([envelope(output({...valid,slides:[]}))]);assert.equal(recovery.status,422);assert.equal(recovery.requests.length,1);
recovery=await scenario([envelope({error:{message:'invalid schema'}},400),envelope(output('{')),envelope(output(valid))]);assert.equal(recovery.status,200);assert.equal(recovery.requests.length,3);assert(recovery.requests[0].response_format);assert(!recovery.requests[1].response_format);assert(!recovery.requests[2].response_format);assert(recovery.requests[2].input.includes('"cinema"'));
recovery=await scenario([envelope({error:{message:'quota'}},429),envelope(output(valid))]);assert.equal(recovery.status,200);assert.equal(recovery.requests.length,2);assert.notEqual(recovery.requests[0].model,recovery.requests[1].model);
recovery=await scenario([envelope({error:{message:'denied'}},403)]);assert.equal(recovery.status,502);assert.equal(recovery.requests.length,1);
recovery=await scenario([envelope(output('{'))],{method:'POST',text:async()=>JSON.stringify({action:'fit-narration',command:'اختصر',currentContent:{slides:[slide]},wordBudget:50})});assert.equal(recovery.status,502);assert.equal(recovery.requests.length,1);
ctx.sanitizeDirection=()=>{throw Error('validation failure');};recovery=await scenario([envelope(output(valid))]);assert.equal(recovery.body.code,'plan_validation_failed');assert.equal(recovery.requests.length,1);
console.log('Structured recovery: wrappers, thought exclusion, truncation, one same-model retry, bounded schema fallback, quota/error separation, no repair of missing facts, and validation diagnostics passed.');
