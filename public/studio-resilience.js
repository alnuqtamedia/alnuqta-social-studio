/* Local checkpoints. This module never touches the saved-project database. */
(function(root){
'use strict';
function create({capture,restore,status,onCandidates=()=>{}}){
 const store=root.StudioJobStore.createStore(),api=root.StudioAPI.createClient();let job=null,storageFailed=false;
 const version='resilience-a1';const retryPolicyVersion='model-waits-v2';
 async function storage(fn,fallback=null){try{return await fn();}catch(e){storageFailed=true;status('لم يكتمل الحفظ المحلي: '+e.message+'؛ احفظ نسخة مستقلة قبل إغلاق الصفحة.','error');return fallback;}}
 async function persist(){if(job)await storage(()=>store.saveJob(job));}
 async function checkpoint(stage,stageStatus='done'){if(!job)return;job.stages[stage]={...(job.stages[stage]||{}),status:stageStatus,updatedAt:Date.now()};if(stageStatus==='done')for(const op of Object.values(job.operations||{}))if(op.stage===stage)op.status='done';job.snapshot=await capture();await persist();onCandidates();}
 async function begin(action,input){const inputHash=await root.StudioJobStore.hash(input);job={id:crypto.randomUUID(),createdAt:Date.now(),updatedAt:Date.now(),inputHash,action,stages:{},operations:{},snapshot:await capture()};await persist();return job;}
 async function request(endpoint,body,{signal,headers}={}){
  const key=await root.StudioJobStore.hash({version,endpoint,body}),tts=/gemini-tts/.test(endpoint),research=/pexels-search/.test(endpoint)||body.action==='search-editorial-media';
  if(!tts){const cached=await storage(()=>store.cacheGet(key));if(cached)return cached;}
  const operation=job?(job.operations[key]||={}):{};if(job)operation.modelCooldowns={...(job.modelCooldowns||{}),...(operation.modelCooldowns||{})};
  const stage=tts?'voice':research?'research':body.action==='review-media'?'review':body.action==='align'?'timeline':body.action==='fit-narration'?'voice':body.action==='transcribe'?'command':'plan';
  const stageLabel={plan:'خطة المشاهد',research:'البحث عن الوسائط',review:'مراجعة اللقطات',voice:'التعليق الصوتي',timeline:'توقيت المشاهد',command:'تفريغ الأمر'}[stage]||stage;operation.stage=stage;if(job){job.stages[stage]={status:'running',inputHash:key};await persist();}
  try{
   const result=await api.request(endpoint,body,{signal,headers,operation,deadlineMs:tts?110000:150000,requestMs:tts?85000:60000,maxRequests:tts?1:3,
    persist:async()=>{if(job){job.modelCooldowns={...(job.modelCooldowns||{}),...(operation.modelCooldowns||{})};job.stages[stage]={...operation,inputHash:key};await persist();}},
    onProgress:p=>status(p.waitMs?`الخدمة مشغولة؛ انتظار ${Math.ceil(p.waitMs/1000)} ثانية قبل المحاولة التالية…`:`${stageLabel} — محاولة ${p.attempt}/${p.maxRequests}`)});
   if(!tts)await storage(()=>store.cachePut(key,result,research?7*86400000:86400000));
   if(job){job.stages[stage]={status:'done',inputHash:key};await persist();}status('اكتملت '+stageLabel+'.','success');return result;
  }catch(e){if(job){job.stages[stage]={...operation,status:e.code==='cancelled'?'pending':operation.status||'blocked_user',lastError:{code:e.code||'network',message:e.message},nextRetryAt:e.nextRetryAt||operation.nextRetryAt||0,inputHash:key};await persist();}throw e;}
 }
 async function latest(){const rows=await storage(()=>store.listJobs(),[]);return rows.filter(x=>x.status!=='done'&&x.snapshot).sort((a,b)=>b.updatedAt-a.updatedAt)[0]||null;}
 async function resume(candidate,{manual=true}={}){
  job=candidate;await restore(job.snapshot);const now=Date.now();
  for(const op of Object.values(job.operations||{}))if(op.status!=='done'){
   // Migrate the known v1 aggregation bug only: a primary model daily wait
   // was attached to a fallback timeout/overload. Preserve the primary wait.
   if(manual&&['plan','review','timeline','command'].includes(op.stage)&&!op.retryPolicyVersion&&['upstream_timeout','temporary_overload'].includes(op.lastError?.code)&&op.nextRetryAt-now>300000){job.modelCooldowns={...(job.modelCooldowns||{}),'gemini-3.6-flash':op.nextRetryAt};op.modelCooldowns={...(op.modelCooldowns||{}),...job.modelCooldowns};op.nextRetryAt=0;op.retryPolicyVersion=retryPolicyVersion;}
   if(op.nextRetryAt>now)continue;
   if(manual){op.attempts=0;op.deadline=0;op.nextRetryAt=0;op.status='pending';}else if(op.attempts>=3||op.deadline<=now)throw Error('انتهت ميزانية المحاولات؛ اضغط استئناف عندما تريد.');
  }
  await persist();return job;
 }
 async function finish(){if(!job)return;job.snapshot=await capture();if(['video','reel','story','tiktok'].includes(job.snapshot.output)&&!job.snapshot.voice?.blob&&!job.snapshot.voice?.human)job.stages.voice={...(job.stages.voice||{}),status:job.stages.voice?.status==='blocked_user'?'blocked_user':'pending'};const blocked=Object.values(job.stages).some(x=>['blocked_user','waiting_auto','failed','pending'].includes(x.status));job.status=blocked?'incomplete':'done';await persist();}
 async function saveBlob(key,blob,meta={}){await storage(()=>store.cachePut('voice:'+key,{blob,meta}));}
 async function getBlob(key){return storage(()=>store.cacheGet('voice:'+key));}
 async function abandon(){if(job){job.status='done';await persist();job=null;}}
 return {abandon,begin,request,checkpoint,latest,resume,finish,persist,saveBlob,getBlob,store,get job(){return job;},get storageFailed(){return storageFailed;}};
}
root.StudioResilience={create};
})(typeof window!=='undefined'?window:globalThis);
