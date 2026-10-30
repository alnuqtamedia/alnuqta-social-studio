import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {stripTypeScriptTypes} from 'node:module';
let handler,limits=0;const upstream=[];
const ctx=vm.createContext({Response,URLSearchParams,AbortSignal,console,Deno:{env:{get:()=> 'fixture-key'},serve(fn){handler=fn;}},authorizeStudioOrigin:()=>({cors:{}}),enforceStudioRateLimit:async()=>{limits++;return null;},searchCommons:async()=>[],fetch:async url=>{upstream.push(new URL(url));return new Response(JSON.stringify({photos:[],videos:[]}));}});
vm.runInContext(stripTypeScriptTypes(fs.readFileSync('backend/pexels-search-preview/index.ts','utf8')).replace(/^import .*;$/mg,''),ctx);
const invoke=body=>handler(new Request('https://example.test',{method:'POST',body:JSON.stringify(body)}));
let r=await invoke({searches:[{query:'hands',type:'video',orientation:'any'},{query:'work',type:'photo'},{query:'Baghdad',type:'photo',provider:'commons'}]});assert.equal(r.status,200);assert.equal((await r.json()).results.length,3);assert.equal(limits,1);assert.equal(upstream.length,2);assert.equal(upstream[0].searchParams.has('orientation'),false);
r=await invoke({searches:Array.from({length:4},()=>({query:'x'}))});assert.equal(r.status,400);assert.equal(upstream.length,2);
r=await invoke({query:'legacy',type:'video',orientation:'portrait'});assert.equal(r.status,200);assert(Array.isArray((await r.json()).items));assert.equal(upstream.at(-1).searchParams.get('orientation'),'portrait');
console.log('Search handler: capped three-query batch, one rate-limit check, any-orientation search, backward-compatible single query.');
