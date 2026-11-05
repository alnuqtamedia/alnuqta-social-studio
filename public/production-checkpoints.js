/* Free, device-local recovery. Never touches the existing saved-project DB. */
(function(root){
'use strict';
const DB='alnuqta-production-checkpoints-v1',LIMIT=5;
function access(mode,action){return new Promise((resolve,reject)=>{
 const open=indexedDB.open(DB,1);open.onupgradeneeded=()=>open.result.createObjectStore('jobs',{keyPath:'id'});open.onerror=()=>reject(open.error);open.onblocked=()=>reject(Error('أغلق تبويب الاستوديو الآخر لإتاحة حفظ الاستكمال'));
 open.onsuccess=()=>{const db=open.result;let tx,request;try{tx=db.transaction('jobs',mode);request=action(tx.objectStore('jobs'));}catch(e){db.close();reject(e);return;}let value;request.onsuccess=()=>value=request.result;tx.oncomplete=()=>{db.close();resolve(value)};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||Error('تعذر حفظ الاستكمال'))};};
});}
async function list(){return (await access('readonly',s=>s.getAll())).sort((a,b)=>b.updatedAt-a.updatedAt);}
async function save(job){if(!job?.id||!job.topic?.slides?.length)throw Error('مشروع الاستكمال غير صالح');let bytes=job.voice?.blob?.size||0;for(const b of Object.values(job.assets||{}))bytes+=b.size||0;if(bytes>250*1024*1024)throw Error('حجم الاستكمال يتجاوز 250MB؛ احفظ المشروع يدوياً');await access('readwrite',s=>s.put({...job,version:1,updatedAt:Date.now()}));const old=(await list()).slice(LIMIT);for(const item of old)await access('readwrite',s=>s.delete(item.id));}
root.StudioCheckpoints={save,list,latest:async()=> (await list())[0]||null};
})(typeof window==='undefined'?globalThis:window);
