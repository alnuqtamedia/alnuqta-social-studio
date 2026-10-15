import {apiError} from './api-errors.mjs';
export const ROUTING_POLICY='model-waits-v2';
export function providerFailure(model,status,data,header='',now=Date.now()){
 const message=String(data?.error?.message||data?.error||`Gemini HTTP ${status}`).slice(0,1200);
 const details=Array.isArray(data?.error?.details)?data.error.details:[];
 const violations=details.flatMap(x=>x.violations||[]);
 const modelQuota=(violations.length>0&&violations.every(x=>x.quotaDimensions?.model))||message.toLowerCase().includes('for model '+model.toLowerCase());
 const source=header?'header':details.some(x=>x.retryDelay)?'retry_info':/retry (?:in|after)/i.test(message)?'message':'none';
 const headerSeconds=/^\s*\d+(?:\.\d+)?\s*$/.test(header)?Number(header):Math.max(0,(Date.parse(header)-now)/1000)||0;
 const delay=Math.max(headerSeconds,...details.map(x=>parseFloat(x.retryDelay)||0),0);
 const error=apiError(status,{error:message,retryAfterSeconds:delay});
 return {model,status,code:error.code,message,retryable:error.retryable,retryAfterSeconds:error.retryAfterSeconds,retryAfterSource:source,scope:status===429&&!modelQuota?'project':'model'};
}
export function summarizeFailures(attempts,now=Date.now()){
 // A project-wide limit applies to every model. Model waits never propagate to others.
 const project=attempts.filter(x=>x.scope==='project'&&x.retryAfterSeconds>0);
 const choices=project.length?project:attempts;
 const chosen=[...choices].sort((a,b)=>project.length?b.retryAfterSeconds-a.retryAfterSeconds:a.retryAfterSeconds-b.retryAfterSeconds)[0]||{code:'upstream_timeout',message:'انتهت مهلة نماذج Gemini.',retryable:true,retryAfterSeconds:0,scope:'model'};
 const allQuota=choices.length>0&&choices.every(x=>x.code==='quota_exhausted');
 return {error:chosen.message,code:allQuota?'quota_exhausted':chosen.code,retryable:!allQuota&&chosen.retryable,retryAfterSeconds:chosen.retryAfterSeconds,retryScope:project.length?'project':'model',retryPolicyVersion:ROUTING_POLICY,upstreamAttempts:attempts.filter(x=>!x.skipped).length,attempts,modelCooldowns:{...Object.fromEntries(attempts.filter(x=>x.scope==='model'&&x.retryAfterSeconds>0).map(x=>[x.model,now+x.retryAfterSeconds*1000])),...(project.length?{'$project':now+chosen.retryAfterSeconds*1000}:{})}};
}
export async function routeModels({models,budgetMs=55000,request,now=()=>Date.now(),cooldowns={},suppliedCooldowns={}}){
 const started=now(),attempts=[];const projectUntil=Math.max(Number(cooldowns.$project)||0,Number(suppliedCooldowns.$project)||0);if(projectUntil>now())return {ok:false,...summarizeFailures([{model:'project',status:429,code:'rate_limited',message:'مهلة مشتركة يفرضها Google على المشروع؛ انتظر قبل الطلب التالي.',retryable:true,retryAfterSeconds:Math.ceil((projectUntil-now())/1000),scope:'project',retryAfterSource:'saved',skipped:true}],now())};
 for(const model of models.slice(0,2)){
  const heldUntil=Math.max(Number(cooldowns[model])||0,Number(suppliedCooldowns[model])||0);
  if(heldUntil>now()){attempts.push({model,status:429,code:'rate_limited',message:'هذا النموذج في فترة انتظار مفروضة من المزود.',retryable:true,retryAfterSeconds:Math.ceil((heldUntil-now())/1000),scope:'model',retryAfterSource:'saved',skipped:true});continue;}
  const remaining=budgetMs-(now()-started);if(remaining<8000)break;
  let response,data;
  try{response=await request(model,AbortSignal.timeout(Math.min(25000,remaining)));data=await response.json();}
  catch{attempts.push({model,status:504,code:'upstream_timeout',message:'انتهت مهلة اتصال هذا النموذج؛ المواد الحالية محفوظة.',retryable:true,retryAfterSeconds:0,retryAfterSource:'none',scope:'model'});continue;}
  if(response.ok)return {ok:true,data,model,attempts,upstreamAttempts:attempts.filter(x=>!x.skipped).length+1};
  const failure=providerFailure(model,response.status,data,response.headers.get('Retry-After')||'',now());attempts.push(failure);
  if(failure.retryAfterSeconds>0)cooldowns[failure.scope==='project'?'$project':model]=now()+failure.retryAfterSeconds*1000;
  if(failure.scope==='project'&&failure.retryAfterSeconds>0)break;
  if([401,403].includes(response.status))break;
 }
 return {ok:false,...summarizeFailures(attempts,now())};
}
