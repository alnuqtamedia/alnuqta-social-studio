import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync('public/studio-production.js','utf8'),start=src.indexOf('async function json(endpoint'),end=src.indexOf('\nconst mediaSearchQueue',start);
let calls=0,mode='once';const ctx=vm.createContext({TypeError,Error,check(){},status(){},setTimeout:fn=>fn(),jsonOnce:async()=>{calls++;if(mode==='once'&&calls>1)return {ok:true};throw mode==='invalid'?Error('invalid source'):TypeError('Failed to fetch');}});vm.runInContext(src.slice(start,end),ctx);
assert.equal((await ctx.json('gemini-tts-preview',{})).ok,true);assert.equal(calls,2);
mode='always';calls=0;await assert.rejects(ctx.json('gemini-tts-preview',{}),/gemini-tts-preview.*محفوظة/);assert.equal(calls,2);
mode='invalid';calls=0;await assert.rejects(ctx.json('gemini-tts-preview',{}),/invalid source/);assert.equal(calls,1);
console.log('PASS service recovery: bounded network retry, named failing service, permanent errors not retried.');
