import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync('public/studio-production.js','utf8'),start=src.indexOf('async function json(endpoint'),end=src.indexOf('\nconst mediaSearchQueue',start);
let calls=0,mode='once';const ctx=vm.createContext({TypeError,Error,check(){},status(){},setTimeout:fn=>fn(),jsonOnce:async()=>{calls++;if(mode==='once'&&calls>1)return {ok:true};throw mode==='invalid'?Error('invalid source'):TypeError('Failed to fetch');}});vm.runInContext(src.slice(start,end),ctx);
assert.equal((await ctx.json('gemini-tts-preview',{})).ok,true);assert.equal(calls,2);
mode='always';calls=0;await assert.rejects(ctx.json('gemini-tts-preview',{}),/gemini-tts-preview.*محفوظة/);assert.equal(calls,2);
mode='invalid';calls=0;await assert.rejects(ctx.json('gemini-tts-preview',{}),/invalid source/);assert.equal(calls,1);
console.log('PASS service recovery: bounded network retry, named failing service, permanent errors not retried.');
const html=fs.readFileSync('index.html','utf8');let ttsCalls=0;
const voiceCtx=vm.createContext({TypeError,Error,AbortController,setTimeout:fn=>{fn();return 1;},clearTimeout(){},document:{getElementById:()=>({value:'Charon'})},window:{STUDIO_PREVIEW_PUBLIC:{anonKey:'test'}},narrationStyle:()=>'',setAIStatus(){},fetch:async()=>{ttsCalls++;if(ttsCalls===1)throw TypeError('Failed to fetch');return {ok:true,json:async()=>({audio:'test'})};}});
// The timer stub must not expire the request; only the retry delay should run immediately.
voiceCtx.setTimeout=(fn,ms)=>{if(ms===500)fn();return 1;};
vm.runInContext(html.slice(html.indexOf('        async function requestNarrationTts('),html.indexOf('        function narrationNumbers(')),voiceCtx);
assert.equal((await voiceCtx.requestNarrationTts('النص')).audio,'test');assert.equal(ttsCalls,2);
console.log('PASS actual narration request retries a browser fetch failure without losing the text.');
