/* Separate database: never upgrades or deletes the saved-project database. */
(function(root){
'use strict';
const DB='alnuqta-studio-jobs',VERSION=1;
async function hash(value){const text=typeof value==='string'?value:JSON.stringify(value);const result=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return [...new Uint8Array(result)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function createStore({indexedDB=root.indexedDB,maxBytes=64*1024*1024,now=()=>Date.now()}={}){
 function open(){return new Promise((resolve,reject)=>{if(!indexedDB)return reject(Error('الحفظ المحلي غير متاح في هذا المتصفح.'));const r=indexedDB.open(DB,VERSION);r.onupgradeneeded=()=>{for(const name of ['jobs','cache'])if(!r.result.objectStoreNames.contains(name))r.result.createObjectStore(name,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('أغلق نسخة التجربة الأخرى ثم أعد المحاولة.'));});}
 async function transact(name,mode,action){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(name,mode);let result;const request=action(tx.objectStore(name));request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||request.error||Error('لم يكتمل الحفظ المحلي.'));});}finally{db.close();}}
 const all=name=>transact(name,'readonly',s=>s.getAll()),get=(name,id)=>transact(name,'readonly',s=>s.get(id)),put=(name,item)=>transact(name,'readwrite',s=>s.put(item));
 async function cacheGet(id){const item=await get('cache',id);if(!item)return null;if(item.expiresAt&&item.expiresAt<=now()){await transact('cache','readwrite',s=>s.delete(id));return null;}item.accessedAt=now();await put('cache',item);return item.value;}
 function bytes(value){if(typeof Blob!=='undefined'&&value instanceof Blob)return value.size;if(Array.isArray(value))return value.reduce((n,x)=>n+bytes(x),0);if(value&&typeof value==='object')return Object.entries(value).reduce((n,[k,v])=>n+k.length*2+bytes(v),0);return String(value??'').length*2;}
 async function cachePut(id,value,ttl=0){const size=bytes(value);if(size>maxBytes)throw Error('المادة أكبر من حد ذاكرة الاستئناف؛ احفظ نسخة مشروع مستقلة.');const list=await all('cache');let total=list.reduce((n,x)=>n+(x.bytes||0),0)-(list.find(x=>x.id===id)?.bytes||0);for(const item of list.filter(x=>x.id!==id).sort((a,b)=>a.accessedAt-b.accessedAt)){if(total+size<=maxBytes)break;await transact('cache','readwrite',s=>s.delete(item.id));total-=item.bytes||0;}await put('cache',{id,value,bytes:size,accessedAt:now(),expiresAt:ttl?now()+ttl:0});}
 async function saveJob(job){job.updatedAt=now();await put('jobs',job);const list=await all('jobs');for(const old of list.sort((a,b)=>b.updatedAt-a.updatedAt).slice(5))await transact('jobs','readwrite',s=>s.delete(old.id));}
 return {getJob:id=>get('jobs',id),listJobs:()=>all('jobs'),saveJob,cacheGet,cachePut,async usage(){return (await all('cache')).reduce((n,x)=>n+(x.bytes||0),0);}};
}
root.StudioJobStore={createStore,hash,DB};
})(typeof window!=='undefined'?window:globalThis);
