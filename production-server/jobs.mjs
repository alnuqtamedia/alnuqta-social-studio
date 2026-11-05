import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export const STAGES=['plan','media','voice','render'];
export function validateInput(raw){
 if(!raw||typeof raw.command!=='string'||!raw.command.trim()||raw.command.length>12000)throw Error('invalid_command');
 if(typeof raw.source!=='string'||raw.source.length>40000)throw Error('invalid_source');
 if(!Number.isInteger(raw.duration)||raw.duration<10||raw.duration>180)throw Error('invalid_duration');
 if(raw.quality!==undefined&&![720,1080].includes(raw.quality))throw Error('invalid_quality');
 if(!['portrait','landscape'].includes(raw.orientation))throw Error('invalid_orientation');
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.requestId||''))throw Error('invalid_request_id');
 if(raw.audio&&(!['audio/wav','audio/mpeg','audio/mp3','audio/ogg','audio/mp4'].includes(raw.audio.mime)||typeof raw.audio.base64!=='string'||raw.audio.base64.length>28*1024*1024||!raw.audio.base64.length||!/^[-\w+/=]+$/.test(raw.audio.base64)))throw Error('invalid_audio');
 return {quality:raw.quality||720,audio:raw.audio?{mime:raw.audio.mime,base64:raw.audio.base64}:null,requestId:raw.requestId,command:raw.command.trim(),source:raw.source,duration:raw.duration,orientation:raw.orientation};
}
export function classify(error){
 const message=String(error?.message||error);
 if(/quota|حصة|429|rate.?limit|حد.*طلبات/i.test(message))return {kind:'quota',retryable:false};
 if(/timeout|timed out|مهلة|تأخر|503|502|ECONNRESET|network|شبكة|fetch failed/i.test(message))return {kind:'transient',retryable:true};
 if(/وسائط|مطابق|تغط|مرجع|هوية|لا توجد|التقرير المصوّر/.test(message))return {kind:'editorial',retryable:false};
 return {kind:'permanent',retryable:false};
}
export class JobStore{
 constructor(root){this.root=path.resolve(root);this.serial=Promise.resolve();}
 async init(){await fs.mkdir(this.root,{recursive:true,mode:0o700});}
 dir(id){if(!/^[0-9a-f-]{36}$/i.test(id))throw Error('invalid_job_id');return path.join(this.root,id);}
 async read(id){return JSON.parse(await fs.readFile(path.join(this.dir(id),'job.json'),'utf8'));}
 async write(job){const dir=this.dir(job.id);await fs.mkdir(dir,{recursive:true,mode:0o700});const temp=path.join(dir,randomUUID()+'.tmp');await fs.writeFile(temp,JSON.stringify(job),{mode:0o600});await fs.rename(temp,path.join(dir,'job.json'));}
 async list(){const dirs=await fs.readdir(this.root,{withFileTypes:true});const jobs=await Promise.allSettled(dirs.filter(d=>d.isDirectory()).map(d=>this.read(d.name)));return jobs.filter(r=>r.status==='fulfilled').map(r=>r.value);}
 async submit(raw){const input=validateInput(raw);const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
 const operation=this.serial.then(async()=>{const old=(await this.list()).find(j=>j.input.requestId===input.requestId);if(old){if(old.inputHash!==hash)throw Error('request_conflict');return old;}
 if((await this.list()).filter(j=>['queued','running','waiting'].includes(j.status)).length>=10)throw Error('queue_full');
 const now=Date.now(),job={id:randomUUID(),version:1,input,inputHash:hash,status:'queued',stage:'plan',completed:[],attempts:{},trace:[],createdAt:now,updatedAt:now,nextAttemptAt:0};if(input.audio){await fs.mkdir(this.dir(job.id),{recursive:true,mode:0o700});await fs.writeFile(path.join(this.dir(job.id),'input-audio.bin'),Buffer.from(input.audio.base64,'base64'),{mode:0o600});job.input.audio={mime:input.audio.mime};}await this.write(job);return job;});this.serial=operation.catch(()=>{});return operation;
 }
 async recover(){for(const job of await this.list())if(job.status==='running'){job.status='queued';job.updatedAt=Date.now();job.trace.push({stage:job.stage,event:'worker_restarted',at:Date.now()});await this.write(job);}}
}
export class Worker{
 constructor(store,adapter){this.store=store;this.adapter=adapter;this.running=false;}
 async tick(){if(this.running)return false;this.running=true;try{
 const jobs=(await this.store.list()).filter(j=>['queued','waiting'].includes(j.status)&&j.nextAttemptAt<=Date.now()).sort((a,b)=>a.createdAt-b.createdAt);const job=jobs[0];if(!job)return false;
 job.status='running';await this.store.write(job);let session;
 try{session=await this.adapter.open(job,this.store.dir(job.id));for(const stage of STAGES){if(job.completed.includes(stage))continue;job.stage=stage;job.attempts[stage]=(job.attempts[stage]||0)+1;const begin=Date.now();job.trace.push({stage,event:'started',at:begin});await this.store.write(job);
 await session.run(stage); // Adapter atomically checkpoints outputs before this resolves.
 job.completed.push(stage);job.trace.push({stage,event:'completed',at:Date.now(),elapsedMs:Date.now()-begin});job.updatedAt=Date.now();await this.store.write(job);}
 job.status='completed';job.error=null;job.updatedAt=Date.now();await this.store.write(job);
 }catch(error){const failure=classify(error);job.error={...failure,message:String(error.message||error).slice(0,700)};job.trace.push({stage:job.stage,event:'failed',...job.error,at:Date.now()});job.status=failure.retryable&&(job.attempts[job.stage]||0)<3?'waiting':'failed';job.nextAttemptAt=job.status==='waiting'?Date.now()+30000*2**Math.max(0,(job.attempts[job.stage]||1)-1):0;job.updatedAt=Date.now();await this.store.write(job);
 }finally{await session?.close();}return true;
 }finally{this.running=false;}}
}
export function publicJob(job){const {input,inputHash,...status}=job;return {...status,requestId:input.requestId};}
