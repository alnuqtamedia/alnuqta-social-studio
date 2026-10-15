/* One request budget, including resumed attempts. No background jobs. */
(function(root){
'use strict';
const transient=new Set(['temporary_overload','rate_limited','network','upstream_timeout']);
function classify(status=0,data={},header='',now=Date.now()){
 const message=String(data.error||data.message||'تعذر الاتصال بالخدمة؛ العمل الحالي باقٍ.');
 let code=data.code;
 if(!['temporary_overload','rate_limited','studio_rate_limit','quota_exhausted','network','invalid_request','upstream_timeout'].includes(code)){
  if(code==='rate_limit_exceeded'||message==='rate_limit_exceeded')code='studio_rate_limit';
  else if(code==='free_tts_quota'||/limit\s*:\s*0\b|daily|per[ _-]?day|quota[^\n]*(?:exhausted|exceeded)/i.test(message))code='quota_exhausted';
  else if(status===429)code='rate_limited';
  else if([500,502,503,504].includes(status)||/high demand|temporarily unavailable/i.test(message))code='temporary_overload';
  else code=status>=400?'invalid_request':'network';
 }
 const retryHeader=Number.isFinite(Number(header))?Number(header):Math.max(0,(Date.parse(header)-now)/1000);
 const retryAfterSeconds=Math.max(0,Number(data.retryAfterSeconds)||0,Number(retryHeader)||0);
 const text=code==='studio_rate_limit'?'وصل الاستوديو إلى حد الطلبات لهذه الساعة؛ انتظر الموعد ثم اضغط استئناف.':code==='quota_exhausted'?'حصة المزود غير متاحة؛ لن نكرر الطلب تلقائياً. العمل الحالي باقٍ.':message;
 return Object.assign(new Error(text),{code,retryable:transient.has(code),retryAfterSeconds,upstreamAttempts:Number(data.upstreamAttempts)||0});
}
function aborted(){return Object.assign(new Error('أُلغي الطلب؛ ما اكتمل من العمل باقٍ.'),{name:'AbortError',code:'cancelled'});}
function sleep(ms,signal){return new Promise((resolve,reject)=>{if(signal?.aborted)return reject(aborted());const cancel=()=>{clearTimeout(timer);reject(aborted());};const timer=setTimeout(()=>{signal?.removeEventListener('abort',cancel);resolve();},ms);signal?.addEventListener('abort',cancel,{once:true});});}
function createClient({fetcher=(...args)=>fetch(...args),now=()=>Date.now(),wait=sleep,random=Math.random,maxConcurrent=2}={}){
 const circuits=new Map(),queue=[];let active=0;
 function drain(){while(active<maxConcurrent&&queue.length){const entry=queue.shift();entry.signal?.removeEventListener('abort',entry.cancel);if(entry.signal?.aborted){entry.reject(aborted());continue;}active++;entry.resolve(()=>{active--;drain();});}}
 function acquire(signal){return new Promise((resolve,reject)=>{if(signal?.aborted)return reject(aborted());const entry={resolve,reject,signal,cancel(){const i=queue.indexOf(entry);if(i>=0)queue.splice(i,1);reject(aborted());}};signal?.addEventListener('abort',entry.cancel,{once:true});queue.push(entry);drain();});}
 async function request(url,body,{signal,headers={},operation={},onProgress=()=>{},persist=async()=>{},deadlineMs=150000,requestMs=60000,maxRequests=3}={}){
  operation.attempts=Number(operation.attempts)||0;
  if(!operation.deadline)operation.deadline=now()+deadlineMs;
  if(signal?.aborted)throw aborted();
  if(['blocked_user','failed'].includes(operation.status))throw classify(operation.status==='failed'?400:429,{error:operation.lastError?.message||'تحتاج هذه المرحلة إلى استئناف يدوي.',code:operation.lastError?.code||'quota_exhausted',retryAfterSeconds:Math.max(0,((operation.nextRetryAt||0)-now())/1000)});
  if(operation.nextRetryAt>now())throw Object.assign(classify(503,{code:'rate_limited',error:'موعد المحاولة التالية لم يحن بعد.',retryAfterSeconds:(operation.nextRetryAt-now())/1000}),{nextRetryAt:operation.nextRetryAt});
  const release=await acquire(signal);let probe=false,circuit;
  try{
   circuit=circuits.get(url)||{failures:0,until:0,probe:false};circuits.set(url,circuit);
   if(circuit.until>now()||circuit.probe)throw Object.assign(classify(503,{code:'temporary_overload',error:'الخدمة تتعافى؛ انتظر قبل المحاولة.',retryAfterSeconds:Math.max(1,(circuit.until-now())/1000)}),{nextRetryAt:Math.max(now()+1000,circuit.until)});
   if(circuit.until){circuit.probe=true;probe=true;}
   let last=classify(503,{error:'انتهت ميزانية المحاولات. اضغط استئناف لبدء محاولة جديدة.'});
   while(operation.attempts<maxRequests&&operation.deadline-now()>=15000){
    if(signal?.aborted)throw aborted();
    const controller=new AbortController(),cancel=()=>controller.abort(),remaining=operation.deadline-now();
    signal?.addEventListener('abort',cancel,{once:true});const timer=setTimeout(cancel,Math.min(requestMs,remaining));
    operation.attempts++;operation.status='running';operation.nextRetryAt=0;await persist(operation);onProgress({attempt:operation.attempts,maxRequests});
    try{
     const response=await fetcher(url,{method:'POST',headers,signal:controller.signal,body:JSON.stringify({...body,budgetMs:Math.min(requestMs-2000,remaining-2000)})});
     let data;try{data=await response.json();}catch{throw classify(502,{error:'الخدمة أعادت بيانات غير مكتملة.'});}
     if(!response.ok)throw classify(response.status,data,response.headers?.get?.('Retry-After')||'',now());
     if(signal?.aborted)throw aborted();
     circuit.failures=0;circuit.until=0;operation.status='done';operation.lastError=null;await persist(operation);return data;
    }catch(error){
     if(signal?.aborted)throw aborted();
     last=error.code?error:classify(0,{error:controller.signal.aborted?'انتهت مهلة الاتصال.':String(error.message||error)});
     operation.lastError={code:last.code,message:last.message};
     if(!last.retryable){operation.status=last.code==='invalid_request'?'failed':'blocked_user';operation.nextRetryAt=now()+last.retryAfterSeconds*1000;await persist(operation);throw last;}
     circuit.failures++;if(circuit.failures>=2)circuit.until=now()+90000;
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
    const delay=Math.max(last.retryAfterSeconds*1000,([3000,8000][Math.min(operation.attempts-1,1)])*(.75+random()*.5),circuit.until-now());
    operation.nextRetryAt=now()+delay;operation.status='waiting_auto';await persist(operation);
    if(operation.attempts>=maxRequests||delay>20000||now()+delay+15000>operation.deadline)throw Object.assign(last,{nextRetryAt:operation.nextRetryAt});
    onProgress({attempt:operation.attempts,maxRequests,waitMs:delay});await wait(delay,signal);
   }
   operation.status='blocked_user';await persist(operation);throw last;
  }finally{if(probe&&circuit)circuit.probe=false;release();}
 }
 return {request,circuits};
}
root.StudioAPI={classify,createClient,sleep};
})(typeof window!=='undefined'?window:globalThis);
