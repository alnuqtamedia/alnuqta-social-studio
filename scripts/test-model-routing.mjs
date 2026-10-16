import assert from 'node:assert/strict';
import {providerFailure,routeModels,summarizeFailures} from '../supabase/functions/_shared_dev/model-routing.mjs';
const response=(status,error,delay='',details=[])=>new Response(JSON.stringify({error:{message:error,details}}),{status,headers:delay?{'Retry-After':delay}:{}});
const quotaDetails=[{violations:[{quotaDimensions:{model:'first'}}]}];
const long=providerFailure('first',429,{error:{message:'limit: 0',details:quotaDetails}},'40000',0);
const overload=providerFailure('second',503,{error:{message:'high demand'}},'',0);
let summary=summarizeFailures([long,overload],0);assert.equal(summary.retryAfterSeconds,0);assert.equal(summary.code,'temporary_overload');assert.equal(summary.modelCooldowns.first,40000000);
summary=summarizeFailures([long,{...overload,retryAfterSeconds:90}],0);assert.equal(summary.retryAfterSeconds,90);
const project={...long,scope:'project'};assert.equal(summarizeFailures([project,overload],0).retryAfterSeconds,40000);
let calls=[];const cooldowns={};let out=await routeModels({models:['first','second'],now:()=>0,cooldowns,request:async model=>{calls.push(model);return model==='first'?response(429,'limit: 0','40000',quotaDetails):response(503,'high demand');}});assert.equal(out.retryAfterSeconds,0);assert.equal(out.attempts.length,2);assert.equal(cooldowns.first,40000000);
calls=[];out=await routeModels({models:['first','second'],now:()=>0,cooldowns,request:async model=>{calls.push(model);return new Response(JSON.stringify({outputs:[{text:'complete'}]}));}});assert.deepEqual(calls,['second']);assert(out.ok);
out=await routeModels({models:['first','second'],now:()=>0,request:async model=>{if(model==='first')return response(429,'limit: 0','40000',quotaDetails);throw Error('timeout');}});assert.equal(out.retryAfterSeconds,0);assert.equal(out.code,'upstream_timeout');
calls=[];out=await routeModels({models:['first','second'],request:async model=>{calls.push(model);return response(429,'project quota','40000');}});assert.equal(calls.length,1);assert.equal(out.retryScope,'project');assert.equal(out.retryAfterSeconds,40000);
assert.equal(providerFailure('first',429,{error:{message:'busy'}},'Thu, 01 Jan 1970 00:02:00 GMT',0).retryAfterSeconds,120);
console.log('Model waits: no longest-wait leakage, per-model cooldowns, timeout isolation, earliest eligible alternative and project limit/date-header protection passed.');

assert.equal(providerFailure('gemini-3.6-flash',429,{error:{message:'Rate limit exceeded for model gemini-3.6-flash (limit: 20 requests per day on Free Tier).'}},'40000',0).scope,'model');

const shared={};let globalCalls=0;await routeModels({models:['first','second'],now:()=>0,cooldowns:shared,request:async()=>{globalCalls++;return response(429,'project quota','30');}});await routeModels({models:['first','second'],now:()=>1000,cooldowns:shared,request:async()=>{globalCalls++;return response(200,'ok');}});assert.equal(globalCalls,1);console.log('Project-wide waits also protect other models and later operations.');
