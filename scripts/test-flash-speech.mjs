import assert from 'node:assert/strict';
import {FREE_TTS_MODELS,requestFlashSpeech} from '../supabase/functions/_shared/flash-speech.mjs';
assert(FREE_TTS_MODELS.every(m=>m.includes('flash')&&!m.includes('pro')));
const good={candidates:[{finishReason:'STOP',content:{parts:[{inlineData:{data:'UklGRg==',mimeType:'audio/wav'}}]}}]};
async function run(replies){const calls=[];const result=await requestFlashSpeech({key:'test',text:'نص محفوظ',voice:'Charon',style:'فصحى',fetchImpl:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});const [status,data]=replies.shift();return {ok:status===200,status,json:async()=>data};}});return {result,calls};}
let x=await run([[200,{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{inlineData:{data:'partial'}}]}}]}],[200,good]]);
assert.equal(x.result.status,200);assert.equal(x.calls.length,2);assert.equal(x.result.body.model,FREE_TTS_MODELS[1]);
assert(x.calls.every(c=>c.body.contents[0].parts[0].text.includes('نص محفوظ')));
x=await run([[429,{error:{message:'Quota exceeded limit: 0',details:[{retryDelay:'500s'}]}}],[429,{error:{message:'quota exceeded'}}]]);
assert.equal(x.result.status,429);assert.equal(x.result.body.attempts.length,2);assert.equal(x.result.body.attempts[0].zeroQuota,true);assert.equal(x.result.body.attempts[0].retryDelay,'500s');assert(!x.result.body.audio);
x=await run([[200,{candidates:[{finishReason:'OTHER'}]}],[200,{candidates:[{finishReason:'STOP'}]}]]);assert.equal(x.result.status,502);assert(!x.result.body.audio);
x=await run([[403,{error:{message:'denied'}}]]);assert.equal(x.calls.length,1);
x=await run([[200,good]]);assert.equal(x.calls.length,1);assert.equal(x.result.body.audio,'UklGRg==');
console.log('Flash speech: incomplete fallback, no Pro, quota diagnostics, access denial and complete audio passed.');
